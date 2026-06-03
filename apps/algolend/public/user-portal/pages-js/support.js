// Support page JS - Neumorphic Update & Branches Data

// Exact Branch Data provided
const branchesData = [
  { name: 'Emdeni South', phone: '067 174 9249', address: '5722 Botani Street, Emdeni, Soweto, 1861.' },
  { name: 'Naledi', phone: '068 483 9246', address: '1 Dumelang Street, Naledi (opposite the train station).' },
  { name: 'Emdeni North', phone: '069 559 8230', address: 'Thuthukani Shopping Centre, 02166 Phidwa Street, Emdeni North, Soweto, 1861.' },
  { name: 'Tshepisong', phone: '065 823 5820', address: '14909 corner Sophie Masite and Hector Peterson Street, Phase 7, Tshepisong.' },
  { name: 'Slovoville', phone: '062 656 3948', address: '11130 Boulevard Street, Slovoville.' },
  { name: 'Braamfischerville', phone: '067 036 6783', address: '16207 corner Apex Drive and Future Street, Phase 4, Braamfischerville.' },
  { name: 'Mthwalume (KZN)', phone: '069 201 8028', address: 'Opposite SASSA Office Umzumbe Magistrate Court Road, Mtwalume, KwaZulu-Natal, 4186.' }
];

function toggleFAQ(element) {
  const faqItem = element.parentElement;
  const wasActive = faqItem.classList.contains('active');
  
  // Close all FAQ items with a smooth height transition
  document.querySelectorAll('.faq-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Toggle current item
  if (!wasActive) {
    faqItem.classList.add('active');
  }
}

function openResource(type) {
  const resourceNames = {
    'user-guide': 'User Guide',
    'terms': 'Terms & Conditions',
    'privacy': 'Privacy Policy'
  };
  
  const name = resourceNames[type] || type;
  
  if (typeof showToast === 'function') {
    showToast('Coming Soon', `${name} document will be available soon.`, 'info', 3000);
  } else {
    alert(`${name} document will be available soon.`);
  }
  
  return false;
}

// ==========================================
// UNIVERSAL MODALS (For Branches)
// ==========================================
window.openUniversalModal = function(title, bodyHTML, isFullScreen = false) {
    const modal = document.getElementById('modern-universal-modal');
    const titleEl = document.getElementById('modern-modal-title');
    const bodyEl = document.getElementById('modern-modal-body');
    if (!modal) return;
    
    titleEl.innerText = title;
    bodyEl.innerHTML = bodyHTML;
    
    if (isFullScreen) modal.classList.add('is-full-screen');
    else modal.classList.remove('is-full-screen');
    
    modal.classList.remove('hidden');
};

window.closeUniversalModal = function() {
    document.getElementById('modern-universal-modal').classList.add('hidden');
};

window.openBranchesModal = function() {
    const html = branchesData.map(branch => `
        <div class="branch-list-item">
            <div class="branch-header">
                <span class="branch-name"><i class="fas fa-map-marker-alt"></i> ${branch.name}</span>
                <button class="action-btn primary" onclick="window.location.href='tel:${branch.phone.replace(/\s+/g, '')}'" style="height: 36px; padding: 0 16px; font-size: 12px;">
                    <i class="fas fa-phone-alt"></i> Call
                </button>
            </div>
            <div class="branch-address">
                ${branch.address}<br>
                <strong style="color: var(--text-main); margin-top: 4px; display: block;">Direct Line: ${branch.phone}</strong>
            </div>
        </div>
    `).join('');

    openUniversalModal('Our Branch Locations', html, false);
};

// Make functions globally accessible
window.toggleFAQ = toggleFAQ;
window.openResource = openResource;

console.log('✅ Support page functions loaded');