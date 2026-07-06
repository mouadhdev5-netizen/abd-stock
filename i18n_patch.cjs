const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');
const namespaces = ['common']; // We can put most shared things in common

function addKey(lang, ns, keyPath, value) {
  const file = path.join(localesDir, lang, `${ns}.json`);
  if (!fs.existsSync(file)) return;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  const parts = keyPath.split('.');
  let current = data;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  
  if (current[parts[parts.length - 1]] === undefined) {
    current[parts[parts.length - 1]] = value;
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  }
}

// Missing from audit
addKey('fr', 'common', 'labels.discontinued', 'Interrompu');
addKey('ar', 'common', 'labels.discontinued', 'متوقف');

// Placeholders
const newKeys = {
  'labels.search_branches': { en: 'Search branches...', fr: 'Rechercher des succursales...', ar: 'البحث عن الفروع...' },
  'labels.search_audit': { en: 'Search by entity or user...', fr: 'Rechercher par entité ou utilisateur...', ar: 'البحث حسب الكيان أو المستخدم...' },
  'labels.search_customers': { en: 'Search customers...', fr: 'Rechercher des clients...', ar: 'البحث عن العملاء...' },
  'labels.search_warehouses': { en: 'Search warehouses...', fr: 'Rechercher des entrepôts...', ar: 'البحث عن المستودعات...' },
  'labels.search_orders': { en: 'Search Order # or Customer...', fr: 'Rechercher Commande # ou Client...', ar: 'البحث عن طلب # أو عميل...' },
  'labels.select_branch': { en: 'Select a branch', fr: 'Sélectionner une succursale', ar: 'حدد فرعا' },
  'labels.all_branches': { en: 'All Branches', fr: 'Toutes les succursales', ar: 'جميع الفروع' },
  'labels.date_range': { en: 'Date Range', fr: 'Plage de dates', ar: 'نطاق التاريخ' },
  'labels.select_supplier': { en: 'Select supplier', fr: 'Sélectionner le fournisseur', ar: 'حدد المورد' },
  'labels.select_status': { en: 'Select status', fr: 'Sélectionner le statut', ar: 'حدد الحالة' },
  'messages.loading': { en: 'Loading...', fr: 'Chargement...', ar: 'جاري التحميل...' },
  'messages.no_data_available': { en: 'No data available', fr: 'Aucune donnée disponible', ar: 'لا توجد بيانات متاحة' }
};

for (const [k, v] of Object.entries(newKeys)) {
  addKey('en', 'common', k, v.en);
  addKey('fr', 'common', k, v.fr);
  addKey('ar', 'common', k, v.ar);
}

console.log('Locales updated.');
