const crypto = require('crypto');
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');

const readEnv = (key, fallback = '') => {
  const value = process.env[key];
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const SURESYSTEMS_API_PREFIX = '/api/sssdswitchuadsrest/v3';

const config = {
  baseUrl: readEnv('SURESYSTEMS_BASE_URL', 'https://ssuat.suresystems.co.za'),
  basicAuthUsername: readEnv('SURESYSTEMS_BASIC_AUTH_USERNAME'),
  basicAuthPassword: readEnv('SURESYSTEMS_BASIC_AUTH_PASSWORD'),
  headerPrefix: readEnv('SURESYSTEMS_HEADER_PREFIX', 'SS'),
  clientId: readEnv('SURESYSTEMS_CLIENT_ID'),
  clientSecret: readEnv('SURESYSTEMS_CLIENT_SECRET'),
  merchantGid: toNumber(readEnv('SURESYSTEMS_MERCHANT_GID'), 0),
  remoteGid: toNumber(readEnv('SURESYSTEMS_REMOTE_GID'), 0),
  systemUsername: readEnv('SURESYSTEMS_SYSTEM_USERNAME', 'apiuser'),
  useMtls: toBoolean(readEnv('SURESYSTEMS_USE_MTLS'), false),
  certPath: readEnv('SURESYSTEMS_CERT_PATH', './certs/client.crt'),
  keyPath: readEnv('SURESYSTEMS_KEY_PATH', './certs/client.key'),
  caPath: readEnv('SURESYSTEMS_CA_PATH', './certs/ca.crt')
};

const isPlaceholderValue = (value) => {
  if (value === null || value === undefined) return true;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return true;
  return [
    'your_client_id',
    'your_client_secret',
    'your_username',
    'your_password',
    '<host>',
    'changeme',
    'replace_me'
  ].includes(normalized);
};

let cachedAgent = null;

function resolveCertPath(filePath) {
  if (!filePath) return null;
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

function getNow() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

function buildContractReference(merchantGid, uniqueSequence) {
  const hexGid = Number(merchantGid).toString(16).toUpperCase().padStart(4, '0').slice(-4);
  const now = new Date();
  const baseDate = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const sequence = String(Math.abs(Number(uniqueSequence) || 0)).padStart(6, '0').slice(-6);
  return `${hexGid}${baseDate}${sequence}`;
}

function getMissingConfig() {
  const required = [
    ['SURESYSTEMS_BASE_URL', config.baseUrl],
    ['SURESYSTEMS_BASIC_AUTH_USERNAME', config.basicAuthUsername],
    ['SURESYSTEMS_BASIC_AUTH_PASSWORD', config.basicAuthPassword],
    ['SURESYSTEMS_CLIENT_ID', config.clientId],
    ['SURESYSTEMS_CLIENT_SECRET', config.clientSecret],
    ['SURESYSTEMS_MERCHANT_GID', config.merchantGid],
    ['SURESYSTEMS_REMOTE_GID', config.remoteGid]
  ];

  return required
    .filter(([key, value]) => {
      if (typeof value === 'number') return value === 0;
      if (isPlaceholderValue(value)) return true;
      return false;
    })
    .map(([key]) => key);
}

function assertConfigured() {
  const missing = getMissingConfig();
  if (missing.length) {
    const error = new Error(`SureSystems is not configured. Missing: ${missing.join(', ')}`);
    error.status = 503;
    error.code = 'SURESYSTEMS_CONFIG_MISSING';
    throw error;
  }
}

function buildBasicAuthHeader() {
  const credentials = `${config.basicAuthUsername}:${config.basicAuthPassword}`;
  return `Basic ${Buffer.from(credentials, 'utf8').toString('base64')}`;
}

function buildSignatureHeaders() {
  const prefix = config.headerPrefix;
  const dts = new Date().toISOString().replace('T', ' ').replace('Z', '').substring(0, 23);
  const message = `${config.clientId}${dts}`;
  const hsh = crypto.createHmac('sha512', config.clientSecret).update(message).digest('base64');

  return {
    [`${prefix}_CLIENTID`]: config.clientId,
    [`${prefix}_DTS`]: dts,
    [`${prefix}_HSH`]: hsh
  };
}

function buildHttpsAgent() {
  if (!config.useMtls) {
    return null;
  }

  if (cachedAgent) {
    return cachedAgent;
  }

  const certFile = resolveCertPath(config.certPath);
  const keyFile = resolveCertPath(config.keyPath);
  const caFile = resolveCertPath(config.caPath);

  if (!certFile || !keyFile || !fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
    const error = new Error('mTLS is enabled but certificate/key files are missing. Check SURESYSTEMS_CERT_PATH and SURESYSTEMS_KEY_PATH.');
    error.status = 500;
    error.code = 'SURESYSTEMS_MTLS_MISSING_FILES';
    throw error;
  }

  cachedAgent = new https.Agent({
    cert: fs.readFileSync(certFile),
    key: fs.readFileSync(keyFile),
    ca: caFile && fs.existsSync(caFile) ? fs.readFileSync(caFile) : undefined,
    rejectUnauthorized: true
  });

  return cachedAgent;
}

function normalizeError(error, fallback) {
  const status = error.status || error.response?.status || 500;
  const body = error.response?.data;
  const message = body?.message || body?.error || error.message || fallback;
  const normalized = new Error(message || fallback);
  normalized.status = status;
  normalized.details = error.details || {
    status,
    code: error.code || error.response?.status || null,
    endpoint: error.endpoint || error.config?.url || null,
    method: error.config?.method?.toUpperCase?.() || 'POST',
    timeout: error.config?.timeout || null,
    providerResponse: body || null,
    networkMessage: error.message || null
  };
  return normalized;
}

async function request(endpoint, payload) {

  assertConfigured();

  const safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${config.baseUrl.replace(/\/$/, '')}${SURESYSTEMS_API_PREFIX}${safeEndpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: buildBasicAuthHeader(),
    ...buildSignatureHeaders()
  };

  // Log outbound SureSystems request
  console.log('=============================================');
  console.log('[SureSystems DEBUG] EXACT REQUEST URL:', url);
  console.log('=============================================');
  console.log('[SureSystems] Outbound Request:', {
    url,
    payload
  });

  try {
    const response = await axios.post(url, payload, {
      headers,
      httpsAgent: config.useMtls ? buildHttpsAgent() : undefined,
      timeout: 30000,
      validateStatus: () => true
    });

    if (response.status < 200 || response.status >= 300) {
      const error = new Error(response.data?.message || 'SureSystems request failed');
      error.status = response.status;
      error.endpoint = url;
      error.details = {
        status: response.status,
        endpoint: url,
        method: 'POST',
        providerResponse: response.data || null
      };
      throw error;
    }

    return response.data;
  } catch (error) {
    throw normalizeError(error, 'SureSystems request failed');
  }
}

function buildMandatePayload(input = {}) {
  const amount = Number(input.amount || 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const contractReference = input.contractReference || buildContractReference(config.merchantGid, Date.now() % 1000000);
  const collectionDate = input.collectionDate || getToday();

  const products = {};
  for (let i = 1; i <= 9; i += 1) {
    products[`product${i}Gid`] = 0;
    products[`product${i}ProductCode`] = '';
    products[`product${i}Amount`] = 0;
  }

  return {
    contractReference,
    payload: {
      messageInfo: {
        merchantGid: config.merchantGid,
        remoteGid: config.remoteGid,
        messageDate: getToday(),
        messageTime: getNow(),
        systemUserName: config.systemUsername,
        frontEndUserName: (input.frontEndUserName || (input.clientNo ? String(input.clientNo).replace(/[^a-zA-Z]/g, '').slice(0, 30) || 'webuser' : 'webuser'))
      },
      mandate: {
        clientNo: input.clientNo || 'WEB001',
        userReference: input.userReference || 'WEBREF',
        frequencyCode: Number(input.frequencyCode || 4),
        installmentAmount: safeAmount,
        noOfInstallments: Number(input.noOfInstallments || 1),
        origin: Number(input.origin || 0),
        binNumber: input.binNumber || '',
        panTrailer: input.panTrailer || '',
        contractReference,
        magId: Number(input.magId || 45),
        debitValueType: Number(input.debitValueType || 1),
        typeOfAuthorizationRequired: Number(input.typeOfAuthorizationRequired || 3),
        initialAmount: Number(input.initialAmount || 0),
        firstCollectionDate: collectionDate,
        maximumCollectionAmount: Number(input.maximumCollectionAmount || Math.max(safeAmount * 1.5, 1)),
        adjustmentCategory: Number(input.adjustmentCategory || 1),
        adjustmentAmount: Number(input.adjustmentAmount || 0),
        adjustmentRate: Number(input.adjustmentRate || 0),
        collectionDay: Number(input.collectionDay || Math.min(new Date().getDate(), 28)),
        dateAdjustmentRuleIndicator: Number(input.dateAdjustmentRuleIndicator || 1),
        trackingIndicator: Number(input.trackingIndicator || 1),
        numberOfTrackingDays: Number(input.numberOfTrackingDays || 3),
        debitSequenceType: input.debitSequenceType || 'OOFF',
        debtorAccountName: input.debtorAccountName || '',
        debtorIdentificationType: Number(input.debtorIdentificationType || 1),
        debtorIdentificationNo: input.debtorIdentificationNo || '',
        debtorAccountNumber: String(input.debtorAccountNumber || '').replace(/[\s\-]/g, ''),
        debtorAccountType: Number(input.debtorAccountType || 1),
        debtorBranchNumber: String(input.debtorBranchNumber || '').replace(/[\s\-]/g, ''),
        entryClass: input.entryClass || '0033',
        debtorTelephone: input.debtorTelephone || '',
        debtorEmail: input.debtorEmail || '',
        mandateInitiationDate: input.mandateInitiationDate || getToday(),
        authorizationIndicator: input.authorizationIndicator || '0229',
        dateList: input.dateList || collectionDate,
        ...products
      }
    }
  };
}

function isExactMandatePayload(input = {}) {
  return Boolean(
    input
    && typeof input === 'object'
    && input.messageInfo
    && typeof input.messageInfo === 'object'
    && input.mandate
    && typeof input.mandate === 'object'
  );
}

async function loadMandate(input = {}) {
  // If caller already provides a fully-formed { messageInfo, mandate } payload, send it as-is.
  if (isExactMandatePayload(input)) {
    const response = await request('/mandates/load', input);
    return {
      contractReference: input.mandate?.contractReference || null,
      response
    };
  }

  // Otherwise build the mandate from the simplified input fields.
  const { contractReference, payload: mandateRequest } = buildMandatePayload(input);

  const response = await request('/mandates/load', mandateRequest);
  return {
    contractReference,
    response
  };
}

async function checkFinalFate({ contractReference, frontEndUserName } = {}) {
  if (!contractReference) {
    const error = new Error('contractReference is required');
    error.status = 400;
    throw error;
  }

  const payload = {
    contractReference,
    merchantGid: config.merchantGid,
    frontEndUserName: frontEndUserName || 'webuser',
    remoteGid: config.remoteGid
  };

  const response = await request('/mandates/finalfate', payload);
  return { response };
}

async function downloadPayments({ frontEndUserName } = {}) {
  const payload = {
    merchantGid: config.merchantGid,
    frontEndUserName: frontEndUserName || config.systemUsername,
    remoteGid: config.remoteGid
  };

  return request('/paymenthistory/download', payload);
}

async function mandateEnquiry(input = {}) {
  const payload = {
    merchantGid: config.merchantGid,
    remoteGid: config.remoteGid,
    contractReference: input.contractReference || '',
    debtorAccountNumber: input.debtorAccountNumber || '',
    frequencyCode: input.frequencyCode !== undefined ? Number(input.frequencyCode) : 4,
    magId: input.magId !== undefined ? Number(input.magId) : 45,
    fromDate: input.fromDate || '',
    toDate: input.toDate || ''
  };

  const response = await request('/mandates/batch/mandateenquiry', payload);
  return { response };
}

async function cancelMandate(input = {}) {
  if (!input.contractReference) {
    const error = new Error('contractReference is required');
    error.status = 400;
    throw error;
  }
  const payload = {
    contractReference: input.contractReference,
    frontEndUserName: input.frontEndUserName || 'webuser',
    remoteGid: config.remoteGid,
    merchantGid: config.merchantGid
  };

  const response = await request('/mandates/cancel', payload);
  return { response };
}

async function createInstallmentRequest(input = {}) {
  if (!input.contractReference) {
    const error = new Error('contractReference is required');
    error.status = 400;
    throw error;
  }
  const payload = {
    merchantGid: config.merchantGid,
    contractReference: input.contractReference,
    remoteGid: config.remoteGid
  };

  const response = await request('/installments/batch/installment', payload);
  return { response };
}

async function updateInstallmentRequest(input = {}) {
  if (!input.installment) {
    const error = new Error('installment is required');
    error.status = 400;
    throw error;
  }
  const payload = {
    messageInfo: {
      merchantGid: config.merchantGid,
      remoteGid: config.remoteGid,
      messageDate: getToday(),
      messageTime: getNow(),
      systemUserName: config.systemUsername,
      frontEndUserName: input.frontEndUserName || 'webuser'
    },
    installment: Array.isArray(input.installment) ? input.installment : [input.installment]
  };

  const response = await request('/installments/batch/update', payload);
  return { response };
}

async function cancelInstallment(input = {}) {
  if (!input.contractReference) {
    const error = new Error('contractReference is required');
    error.status = 400;
    throw error;
  }
  if (input.installmentNo === undefined || input.installmentNo === null) {
    const error = new Error('installmentNo is required');
    error.status = 400;
    throw error;
  }
  const payload = {
    contractReference: input.contractReference,
    installmentNo: input.installmentNo,
    action: input.action || 'C',
    frontEndUserName: input.frontEndUserName || 'webuser',
    remoteGid: config.remoteGid,
    merchantGid: config.merchantGid
  };

  const response = await request('/installments/cancel', payload);
  return { response };
}

async function probeConnectivity() {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  if (!baseUrl) {
    const error = new Error('SureSystems base URL is not configured');
    error.status = 503;
    error.code = 'SURESYSTEMS_BASE_URL_MISSING';
    throw error;
  }

  try {
    const response = await axios.get(baseUrl, {
      headers: {
        Authorization: buildBasicAuthHeader()
      },
      httpsAgent: config.useMtls ? buildHttpsAgent() : undefined,
      timeout: 10000,
      validateStatus: () => true
    });

    return {
      reachable: true,
      status: response.status,
      statusText: response.statusText,
      baseUrl,
      configured: getMissingConfig().length === 0,
      useMtls: config.useMtls,
      missing: getMissingConfig(),
      headers: response.headers || {}
    };
  } catch (error) {
    const normalized = normalizeError(error, 'SureSystems connectivity probe failed');
    return {
      reachable: false,
      status: normalized.status || null,
      baseUrl,
      configured: getMissingConfig().length === 0,
      useMtls: config.useMtls,
      missing: getMissingConfig(),
      error: normalized.message,
      details: normalized.details || null
    };
  }
}

function getConfigStatus() {
  const missing = getMissingConfig();
  return {
    configured: missing.length === 0,
    useMtls: config.useMtls,
    headerPrefix: config.headerPrefix,
    merchantGid: config.merchantGid || null,
    remoteGid: config.remoteGid || null,
    missing
  };
}

module.exports = {
  getToday,
  getConfigStatus,
  loadMandate,
  checkFinalFate,
  downloadPayments,
  mandateEnquiry,
  cancelMandate,
  createInstallmentRequest,
  updateInstallmentRequest,
  cancelInstallment,
  probeConnectivity,
  // Exposed for unit testing only — do not use in production code
  _test: {
    config,
    readEnv,
    toBoolean,
    toNumber,
    isPlaceholderValue,
    getMissingConfig,
    buildBasicAuthHeader,
    buildSignatureHeaders,
    buildContractReference,
    buildMandatePayload,
    isExactMandatePayload,
    normalizeError,
    getToday,
    getNow,
    assertConfigured,
    toSureSystemsDate: (v) => {
      if (!v) return null;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString().slice(0, 10).replace(/-/g, '');
    }
  }
};
