'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { useLocale } from '@/features/i18n/locale-context';

const FR: Record<string, string> = {
  'تجهيزات الدخول المدرسي': 'Fournitures de rentrée',
  'الكتب والدفاتر والأدوات واللوازم التي تنشرها المدرسة للأسر.': 'Livres, cahiers, fournitures et matériel publiés par l’école à destination des familles.',
  'العودة إلى اللوائح': 'Retour aux listes',
  '+ إنشاء لائحة': '+ Créer une liste',
  'جارٍ حسم السنة الدراسية…': 'Chargement de l’année scolaire…',
  'لائحة جديدة': 'Nouvelle liste',
  'اسم اللائحة': 'Nom de la liste',
  'المستوى': 'Niveau',
  'اختر المستوى': 'Choisir le niveau',
  'القسم — اختياري': 'Classe — facultatif',
  'كل أقسام المستوى': 'Toutes les classes du niveau',
  'حفظ المسودة': 'Enregistrer le brouillon',
  'إلغاء': 'Annuler',
  'لوائح السنة الدراسية': 'Listes de l’année scolaire',
  'جارٍ تحميل اللوائح…': 'Chargement des listes…',
  'لا توجد لائحة لهذه السنة بعد': 'Aucune liste pour cette année',
  'أنشئ لائحة للمستوى ثم أضف العناصر يدويًا أو استوردها من Excel.': 'Créez une liste pour le niveau, puis ajoutez les articles manuellement ou importez-les depuis Excel.',
  'إنشاء أول لائحة': 'Créer la première liste',
  'اللائحة': 'Liste',
  'مستوى غير محدد': 'Niveau non défini',
  'الحالة': 'Statut',
  'الحالية': 'Actuelle',
  'العناصر': 'Articles',
  'النسخة': 'Version',
  'مسودة': 'Brouillon',
  'قيد المراجعة': 'En révision',
  'منشورة': 'Publiée',
  'مؤرشفة': 'Archivée',
  'النسخة الحالية': 'Version actuelle',
  'النطاق': 'Périmètre',
  'إرسال للمراجعة': 'Envoyer en révision',
  'نشر اللائحة': 'Publier la liste',
  'إنشاء نسخة محدثة': 'Créer une nouvelle version',
  'أرشفة': 'Archiver',
  'أضيف في هذه النسخة': 'Ajoutés dans cette version',
  'عناصر تغيرت': 'Articles modifiés',
  'عناصر حذفت': 'Articles supprimés',
  'عناصر اللائحة': 'Articles de la liste',
  'إغلاق الإضافة': 'Fermer l’ajout',
  '+ إضافة عنصر': '+ Ajouter un article',
  'إجمالي العناصر': 'Total des articles',
  'كتب مقررة': 'Manuels scolaires',
  'دفاتر': 'Cahiers',
  'جارٍ تحميل مواد ومقررات هذا المستوى…': 'Chargement des matières et manuels de ce niveau…',
  'إضافة تجهيز إلى مادة': 'Ajouter une fourniture à une matière',
  'أدخل الكتاب أو الدفتر، اربطه بالمادة، وحدد أغلفته قبل الحفظ.': 'Ajoutez le livre ou le cahier, associez-le à la matière et précisez ses couvertures avant d’enregistrer.',
  'النوع': 'Type',
  'الكمية': 'Quantité',
  'المادة': 'Matière',
  'اختر مادة هذا المستوى': 'Choisir une matière de ce niveau',
  'لا توجد مواد مفعلة لهذا المستوى. راجع إعدادات مواد المستوى.': 'Aucune matière n’est activée pour ce niveau. Vérifiez la configuration des matières.',
  'المقرر المعتمد': 'Manuel homologué',
  'اختر المقرر': 'Choisir le manuel',
  'المادة مفعلة، لكن لا يوجد مقرر معتمد لها في السنة والمستوى المحددين.': 'La matière est activée, mais aucun manuel homologué n’est défini pour cette année et ce niveau.',
  'اسم العنصر': 'Nom de l’article',
  'مثال: دفتر 96 صفحة': 'Exemple : cahier 96 pages',
  'اسم الكتاب أو العنصر': 'Nom du livre ou de l’article',
  'حجم الدفتر': 'Format du cahier',
  'كبير': 'Grand',
  'صغير': 'Petit',
  'أغلفة الكتب': 'Couvertures de livres',
  'أغلفة الدفاتر الكبيرة': 'Protège-cahiers grand format',
  'أغلفة الدفاتر الصغيرة': 'Protège-cahiers petit format',
  '+ إضافة غلاف': '+ Ajouter une couverture',
  'اتركه فارغًا إذا كان العنصر لا يحتاج إلى غلاف.': 'Laissez vide si l’article ne nécessite pas de couverture.',
  'الأهمية': 'Importance',
  'إلزامي': 'Obligatoire',
  'اختياري': 'Facultatif',
  'من يوفره؟': 'Fourni par',
  'الأسرة': 'Famille',
  'المدرسة': 'École',
  'إعادة الاستعمال': 'Réutilisation',
  'غير محدد': 'Non défini',
  'يمكن إعادة استعماله': 'Peut être réutilisé',
  'لا': 'Non',
  'إضافة إلى المسودة': 'Ajouter au brouillon',
  'جارٍ الربط…': 'Liaison en cours…',
  'تأكيد الربط': 'Confirmer la liaison',
  'كتاب مقرر': 'Manuel scolaire',
  'كتاب آخر': 'Autre livre',
  'دفتر': 'Cahier',
  'أداة مدرسية': 'Fourniture scolaire',
  'زي': 'Tenue',
  'مستلزم': 'Matériel',
  'أخرى': 'Autre',
  'العنصر': 'Article',
  'المادة / المرجع': 'Matière / référence',
  'مقرر مرتبط': 'Manuel lié',
  'التوفير': 'Prise en charge',
  'قابل لإعادة الاستعمال': 'Réutilisable',
  'الحالة والإجراء': 'Statut et action',
  'يحتاج إلى ربط': 'À lier',
  'مرتبط بالمقرر': 'Lié au manuel',
  'ربط': 'Lier',
  'اختيار مقرر موجود': 'Choisir un manuel existant',
  'حذف': 'Supprimer',
  'اللائحة فارغة': 'La liste est vide',
  'أضف العناصر يدويًا أو استخدم استيراد Excel من لوحة الأدوات.': 'Ajoutez les articles manuellement ou utilisez l’import Excel depuis le panneau d’outils.',
  'الملاحظات': 'Remarques',
  'تعليمات عامة تظهر للأسر بعد الكتب والدفاتر والأدوات.': 'Consignes générales affichées aux familles après les livres, cahiers et fournitures.',
  'مثال: يرجى عدم كتابة اسم التلميذ قبل التأكد من اللائحة.': 'Exemple : merci de ne pas inscrire le nom de l’élève avant de vérifier la liste.',
  'جارٍ الحفظ…': 'Enregistrement…',
  'حفظ الملاحظات': 'Enregistrer les remarques',
  'لا توجد ملاحظات.': 'Aucune remarque.',
  'هذه النسخة غير قابلة للتعديل مباشرة': 'Cette version ne peut pas être modifiée directement',
  'أنشئ نسخة محدثة لإجراء تغييرات جديدة.': 'Créez une nouvelle version pour effectuer des modifications.',
  'أعدها إلى مسار المسودة حسب دورة العمل قبل تعديل العناصر.': 'Ramenez-la au statut de brouillon selon le workflow avant de modifier les articles.',
  'تغيير المادة': 'Changer la matière',
  'اختر المادة': 'Choisir la matière',
  'حفظ': 'Enregistrer',
  'ربط بالمادة': 'Associer à la matière',
  'لا توجد مواد مفعلة لهذا المستوى.': 'Aucune matière n’est activée pour ce niveau.',
  'توفره المدرسة': 'Fourni par l’école',
  'توفره الأسرة': 'Fourni par la famille',
  'غلاف كتاب': 'Couverture de livre',
  'غلاف دفتر كبير': 'Protège-cahier grand format',
  'غلاف دفتر صغير': 'Protège-cahier petit format',
  'تعديل': 'Modifier',
  'توزيع الألوان': 'Répartir les couleurs',
  '+ غلاف': '+ Couverture',
  '+ لون آخر': '+ Autre couleur',
  'لا يمكن تكرار اللون نفسه.': 'La même couleur ne peut pas être répétée.',
  'مادة غير محددة': 'Matière non définie',
  'كتاب إضافي': 'Livre complémentaire',
  'صفحة': 'pages',
  'الحجم:': 'Format :',
  'الغرض:': 'Usage :',
  'حجم الدفتر والغلاف': 'Format du cahier et du protège-cahier',
  'تجهيز المواد': 'Fournitures par matière',
  'افتح مادة واحدة لإضافة كتبها ودفاترها وأغلفة كل عنصر على حدة.': 'Ouvrez une matière pour ajouter ses livres, cahiers et les couvertures de chaque article séparément.',
  'لم تُجهّز بعد': 'Pas encore préparée',
  '✓ مجهزة': '✓ Préparée',
  'ابدأ التجهيز': 'Commencer',
  'الكتب': 'Livres',
  'لا توجد كتب بعد': 'Aucun livre pour le moment',
  '+ كتاب مقرر': '+ Manuel scolaire',
  '+ كتاب آخر': '+ Autre livre',
  'أضف الكتاب، ثم حدد غلافه إن كان مطلوبًا.': 'Ajoutez le livre, puis précisez sa couverture si nécessaire.',
  'الدفاتر': 'Cahiers',
  'لا توجد دفاتر بعد': 'Aucun cahier pour le moment',
  '+ إضافة دفتر': '+ Ajouter un cahier',
  'أضف كل دفتر على حدة لتحديد كميته ولون غلافه بدقة.': 'Ajoutez chaque cahier séparément afin de préciser sa quantité et la couleur de sa couverture.',
  'عناصر تحتاج إلى مادة': 'Articles à associer à une matière',
  'هذه عناصر قديمة أو مستوردة؛ اربطها بالمادة قبل النشر.': 'Ces articles sont anciens ou importés ; associez-les à une matière avant publication.',
  'الأدوات واللوازم': 'Fournitures et matériel',
  'قائمة واحدة جامعة للأدوات والمستلزمات والزي وبقية العناصر.': 'Une liste regroupant fournitures, matériel, tenue et autres articles.',
  'Excel': 'Excel',
  'ابدأ من النموذج الرسمي، عاين الملف ثم طبّقه على المسودة.': 'Commencez par le modèle officiel, prévisualisez le fichier puis appliquez-le au brouillon.',
  'تحميل النموذج': 'Télécharger le modèle',
  'ملف XLSX': 'Fichier XLSX',
  'معاينة': 'Prévisualiser',
  'تطبيق على المسودة': 'Appliquer au brouillon',
  'الاستيراد متاح على المسودة فقط': 'L’import est disponible uniquement pour un brouillon',
  'أنشئ نسخة محدثة قبل استيراد ملف جديد.': 'Créez une nouvelle version avant d’importer un nouveau fichier.',
  'إجمالي': 'Total',
  'مقبول': 'Valide',
  'يحتاج مراجعة': 'À vérifier',
  'مرفوض': 'Rejeté',
  'يحتاج ربط المقرر': 'Manuel à lier',
  'الوثائق': 'Documents',
  'PDF أو صورة مرجعية للائحة الأصلية، منفصلة عن البيانات المنظمة.': 'PDF ou image de référence de la liste d’origine, séparé des données structurées.',
  'إرفاق ملف': 'Joindre un fichier',
  'ملف': 'Fichier',
  'تنزيل': 'Télécharger',
  'لا توجد وثائق مرفقة.': 'Aucun document joint.',
  'المرفقات مقفلة بعد خروج اللائحة من المسودة.': 'Les pièces jointes sont verrouillées dès que la liste quitte le brouillon.',
  'الطباعة': 'Impression',
  'نسخة A4 جاهزة للطباعة أو للحفظ كـPDF، مع نموذج فارغ عند الحاجة.': 'Version A4 prête à imprimer ou à enregistrer en PDF, avec un modèle vierge si nécessaire.',
  'طباعة اللائحة': 'Imprimer la liste',
  'نموذج فارغ': 'Modèle vierge',
  'إذا أضاف Chrome أو Edge التاريخ أو عنوان الصفحة إلى PDF، عطّل خيار «Headers and footers / En-têtes et pieds de page» من نافذة الطباعة.': 'Si Chrome ou Edge ajoute la date ou le titre de la page au PDF, désactivez l’option « En-têtes et pieds de page » dans la boîte de dialogue d’impression.',
  'مشاركة اللائحة': 'Partager la liste',
  'رابط قراءة مرمّز للنسخة المنشورة فقط، غير مخصص للبحث أو الاكتشاف العام.': 'Lien de consultation sécurisé réservé à la version publiée, non destiné à l’indexation ou à la découverte publique.',
  'المشاركة متاحة بعد النشر': 'Le partage est disponible après publication',
  'لا يمكن إنشاء رابط عام لمسودة أو نسخة قيد المراجعة.': 'Un lien public ne peut pas être créé pour un brouillon ou une version en révision.',
  'رابط نشط': 'Lien actif',
  'الرابط': 'Lien',
  'الرمز الخام لا يُخزن. دوّر الرابط للحصول على رابط جديد قابل للنسخ.': 'Le jeton brut n’est pas conservé. Renouvelez le lien pour obtenir une nouvelle URL copiable.',
  'إنشاء رابط': 'Créer un lien',
  'تدوير الرابط': 'Renouveler le lien',
  'نسخ / مشاركة': 'Copier / partager',
  'إبطال الرابط': 'Révoquer le lien',
  'ربط الكتاب بالمقرر': 'Lier le livre au manuel',
  'متابعة الربط': 'Continuer',
  'خطوات الربط': 'Étapes de liaison',
  'معلومات الكتاب': 'Informations du livre',
  'اختيارات الربط': 'Choix de liaison',
  'التأكيد': 'Confirmation',
  'المعلومات الأساسية': 'Informations principales',
  'تحقق من بيانات الكتاب، ثم أكمل فقط الاختيارات التي يحتاجها النظام.': 'Vérifiez les informations du livre, puis complétez uniquement les choix demandés par le système.',
  'عنوان الكتاب': 'Titre du livre',
  'السنة الدراسية': 'Année scolaire',
  'الناشر': 'Éditeur',
  'الطبعة': 'Édition',
  '1. تحديد المادة': '1. Sélection de la matière',
  '2. لغة التدريس': '2. Langue d’enseignement',
  'لغة التدريس': 'Langue d’enseignement',
  'جارٍ تحميل اللغات…': 'Chargement des langues…',
  'اختر لغة التدريس': 'Choisir la langue d’enseignement',
  '3. اختيار المرجع': '3. Choix de la référence',
  '4. اختيار المقرر': '4. Choix du manuel',
  'سيبحث رقيم عن المرجع والمقرر المناسبين تلقائيًا': 'Raqeem recherchera automatiquement la référence et le manuel appropriés',
  'إذا احتاج الربط إلى معلومة إضافية، ستظهر لك الخطوة المطلوبة هنا دون مغادرة النافذة.': 'Si une information supplémentaire est nécessaire, l’étape correspondante apparaîtra ici sans quitter cette fenêtre.',
  'مراجعة المقررات المعتمدة': 'Vérifier les manuels homologués',
  'شفاف': 'Transparent',
  'أحمر': 'Rouge',
  'أزرق': 'Bleu',
  'أخضر': 'Vert',
  'أصفر': 'Jaune',
  'برتقالي': 'Orange',
  'وردي': 'Rose',
  'بنفسجي': 'Violet',
  'أسود': 'Noir',
  'أبيض': 'Blanc',
};

const PATTERNS: Array<[RegExp, (...parts: string[]) => string]> = [
  [/^السنة الدراسية:\s*(.+)$/u, (_all, year) => `Année scolaire : ${year}`],
  [/^(\d+)\s+تحتاج إلى ربط$/u, (_all, count) => `${count} à lier`],
  [/^(\d+)\s+كتابًا يحتاج إلى ربط$/u, (_all, count) => `${count} livre${count === '1' ? '' : 's'} à lier`],
  [/^تم النشر مع\s+(\d+)\s+تنبيه\.$/u, (_all, count) => `Publication effectuée avec ${count} avertissement${count === '1' ? '' : 's'}.`],
  [/^حذف «(.+)» من هذه المسودة؟$/u, (_all, name) => `Supprimer « ${name} » de ce brouillon ?`],
  [/^ربط «(.+)» بالمقرر$/u, (_all, name) => `Lier « ${name} » au manuel`],
  [/^(\d+) كتب · (\d+) دفاتر · (\d+) أغلفة$/u, (_all, books, notebooks, covers) => `${books} livres · ${notebooks} cahiers · ${covers} couvertures`],
  [/^(\d+) عناصر$/u, (_all, count) => `${count} articles`],
  [/^مجموع الأغلفة:\s*(\d+(?:\.\d+)?)\s+من\s+(\d+(?:\.\d+)?)$/u, (_all, total, quantity) => `Total des couvertures : ${total} sur ${quantity}`],
  [/^تم توزيع\s+(\d+(?:\.\d+)?)\s+من\s+(\d+(?:\.\d+)?)$/u, (_all, total, quantity) => `${total} sur ${quantity} répartis`],
  [/^لون الغلاف\s+(\d+)(?:\s+لـ\s+(.+))?$/u, (_all, index, name) => `Couleur de la couverture ${index}${name ? ` — ${name}` : ''}`],
  [/^كمية الغلاف\s+(\d+)(?:\s+لـ\s+(.+))?$/u, (_all, index, name) => `Quantité de la couverture ${index}${name ? ` — ${name}` : ''}`],
  [/^حذف لون الغلاف\s+(\d+)$/u, (_all, index) => `Supprimer la couleur de couverture ${index}`],
  [/^تعديل كمية\s+(.+)$/u, (_all, name) => `Modifier la quantité — ${name}`],
  [/^كمية\s+(.+)$/u, (_all, name) => `Quantité — ${name}`],
  [/^تغيير مادة\s+(.+)$/u, (_all, name) => `Changer la matière — ${name}`],
  [/^المادة المرتبطة بـ\s+(.+)$/u, (_all, name) => `Matière associée — ${name}`],
  [/^تمثيل بصري لغلاف\s+(.+)$/u, (_all, name) => `Aperçu de couverture — ${name}`],
  [/^حجم الدفتر\s+(.+)$/u, (_all, name) => `Format du cahier — ${name}`],
  [/^(\d+)\s+صفوف متكررة محتملة$/u, (_all, count) => `${count} lignes potentiellement dupliquées`],
  [/^الصف\s+(\d+):\s*(.+)$/u, (_all, row, name) => `Ligne ${row} : ${name}`],
  [/^طُبق\s+(\d+)\s+صفًا$/u, (_all, count) => `${count} lignes appliquées`],
];

function translateCore(value: string): string {
  if (FR[value]) return FR[value];
  for (const [pattern, replacement] of PATTERNS) {
    const match = value.match(pattern);
    if (match) return replacement(...match);
  }
  return value;
}

export function translateEntryRequirementsLegacyText(value: string): string {
  if (!value) return value;
  const leading = value.match(/^\s*/u)?.[0] ?? '';
  const trailing = value.match(/\s*$/u)?.[0] ?? '';
  const core = value.slice(leading.length, Math.max(leading.length, value.length - trailing.length));
  if (!core) return value;
  const translated = translateCore(core);
  return translated === core ? value : `${leading}${translated}${trailing}`;
}

const ATTRIBUTES = ['aria-label', 'placeholder', 'title'] as const;

function visitText(root: Node, callback: (node: Text) => void) {
  if (root.nodeType === Node.TEXT_NODE) {
    callback(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    callback(current as Text);
    current = walker.nextNode();
  }
}

function visitElements(root: Node, callback: (element: Element) => void) {
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) callback(root as Element);
  for (const element of Array.from((root as ParentNode).querySelectorAll?.('*') ?? [])) callback(element);
}

export function EntryRequirementsLocalizationBoundary({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || locale !== 'fr') return;

    const textOriginals = new Map<Text, string>();
    const attrOriginals = new Map<Element, Map<string, string>>();

    const localizeText = (node: Text) => {
      if (node.parentElement?.closest('script, style, code, pre')) return;
      const original = textOriginals.get(node) ?? node.data;
      if (!textOriginals.has(node)) textOriginals.set(node, original);
      const translated = translateEntryRequirementsLegacyText(original);
      if (node.data !== translated) node.data = translated;
    };

    const localizeElement = (element: Element) => {
      if (element.closest('script, style, code, pre')) return;
      for (const attribute of ATTRIBUTES) {
        const current = element.getAttribute(attribute);
        if (!current) continue;
        let originals = attrOriginals.get(element);
        if (!originals) {
          originals = new Map<string, string>();
          attrOriginals.set(element, originals);
        }
        const original = originals.get(attribute) ?? current;
        if (!originals.has(attribute)) originals.set(attribute, original);
        const translated = translateEntryRequirementsLegacyText(original);
        if (translated !== current) element.setAttribute(attribute, translated);
      }

      if (element instanceof HTMLInputElement && element.type === 'text' && element.value === 'تجهيزات الدخول المدرسي') {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(element, 'Fournitures de rentrée');
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    const localizeTree = (node: Node) => {
      visitText(node, localizeText);
      visitElements(node, localizeElement);
    };

    localizeTree(root);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') localizeText(mutation.target as Text);
        if (mutation.type === 'attributes' && mutation.target instanceof Element) localizeElement(mutation.target);
        for (const node of mutation.addedNodes) localizeTree(node);
      }
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRIBUTES],
    });

    const portalObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node === root || (node instanceof Element && node.contains(root))) continue;
          localizeTree(node);
        }
      }
    });
    portalObserver.observe(document.body, { childList: true, subtree: true });

    const originalConfirm = window.confirm;
    window.confirm = ((message?: string) => originalConfirm(translateEntryRequirementsLegacyText(String(message ?? '')))) as typeof window.confirm;

    return () => {
      observer.disconnect();
      portalObserver.disconnect();
      window.confirm = originalConfirm;
      for (const [node, original] of textOriginals) if (node.isConnected) node.data = original;
      for (const [element, originals] of attrOriginals) {
        if (!element.isConnected) continue;
        for (const [name, original] of originals) element.setAttribute(name, original);
      }
    };
  }, [locale]);

  return <div ref={rootRef} style={{ display: 'contents' }}>{children}</div>;
}
