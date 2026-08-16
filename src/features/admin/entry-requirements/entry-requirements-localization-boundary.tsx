'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { useLocale } from '@/features/i18n/locale-context';

const FRENCH_EXACT: Record<string, string> = {
  'تجهيزات الدخول المدرسي': 'Fournitures de rentrée',
  'تم حفظ العملية بنجاح.': 'Opération enregistrée avec succès.',
  'تم إنشاء المسودة.': 'Brouillon créé.',
  'اختر المادة المرتبطة بهذا الكتاب أو الدفتر.': 'Sélectionnez la matière associée à ce livre ou cahier.',
  'تحقق من ألوان الأغلفة وكمياتها؛ لا يجوز تكرار اللون أو تجاوز كمية العنصر.': 'Vérifiez les couleurs et les quantités des protège-cahiers : une couleur ne peut pas être répétée et le total ne peut pas dépasser la quantité de l’article.',
  'اختر المقرر المعتمد أولًا.': 'Sélectionnez d’abord le manuel homologué.',
  'كتاب مقرر': 'Manuel scolaire',
  'كتاب آخر': 'Autre livre',
  'دفتر': 'Cahier',
  'أداة مدرسية': 'Fourniture scolaire',
  'زي': 'Tenue',
  'مستلزم': 'Matériel',
  'أخرى': 'Autre',
  'أدخل اسم العنصر.': 'Saisissez le nom de l’article.',
  'تمت إضافة العنصر وربطه بالمادة مع أغلفته.': 'L’article a été ajouté et associé à la matière avec ses couvertures.',
  'تم ربط الكتاب بالمقرر المعتمد.': 'Le livre a été lié au manuel homologué.',
  'تم حذف العنصر من المسودة.': 'L’article a été supprimé du brouillon.',
  'تم تحديث الكمية.': 'La quantité a été mise à jour.',
  'تم ربط العنصر بالمادة ونقله إلى بطاقتها.': 'L’article a été associé à la matière et déplacé dans sa fiche.',
  'تم حفظ توزيع ألوان الأغلفة.': 'La répartition des couleurs des couvertures a été enregistrée.',
  'تمت إزالة الأغلفة من العنصر.': 'Les couvertures ont été retirées de l’article.',
  'تم تحديث حجم الدفتر وربط غلافه بالحجم الصحيح.': 'Le format du cahier et de sa couverture a été mis à jour.',
  'تم حفظ ملاحظات اللائحة.': 'Les remarques de la liste ont été enregistrées.',
  'تم نشر اللائحة.': 'La liste a été publiée.',
  'اللائحة': 'Liste',
  'مستوى غير محدد': 'Niveau non défini',
  'كل أقسام المستوى': 'Toutes les classes du niveau',
  'الحالة': 'Statut',
  'الحالية': 'Actuelle',
  'العناصر': 'Articles',
  'النسخة': 'Version',
  'العنصر': 'Article',
  'النوع': 'Type',
  'المادة / المرجع': 'Matière / référence',
  'مقرر مرتبط': 'Manuel lié',
  'الكمية': 'Quantité',
  'الكمية:': 'Quantité :',
  'التوفير': 'Prise en charge',
  'المدرسة': 'École',
  'الأسرة': 'Famille',
  'قابل لإعادة الاستعمال': 'Réutilisable',
  'الحالة والإجراء': 'Statut et action',
  'يحتاج إلى ربط': 'À lier',
  'مرتبط بالمقرر': 'Lié au manuel',
  'ربط': 'Lier',
  'اختيار مقرر موجود': 'Choisir un manuel existant',
  'حذف': 'Supprimer',
  'الكتب والدفاتر والأدوات واللوازم التي تنشرها المدرسة للأسر.': 'Livres, cahiers, fournitures et matériel publiés par l’école à destination des familles.',
  'العودة إلى اللوائح': 'Retour aux listes',
  '+ إنشاء لائحة': '+ Créer une liste',
  'جارٍ حسم السنة الدراسية…': 'Chargement de l’année scolaire…',
  'لائحة جديدة': 'Nouvelle liste',
  'اسم اللائحة': 'Nom de la liste',
  'المستوى': 'Niveau',
  'اختر المستوى': 'Choisir le niveau',
  'القسم — اختياري': 'Classe — facultatif',
  'حفظ المسودة': 'Enregistrer le brouillon',
  'إلغاء': 'Annuler',
  'لوائح السنة الدراسية': 'Listes de l’année scolaire',
  'جارٍ تحميل اللوائح…': 'Chargement des listes…',
  'لا توجد لائحة لهذه السنة بعد': 'Aucune liste pour cette année',
  'أنشئ لائحة للمستوى ثم أضف العناصر يدويًا أو استوردها من Excel.': 'Créez une liste pour le niveau, puis ajoutez les articles manuellement ou importez-les depuis Excel.',
  'إنشاء أول لائحة': 'Créer la première liste',
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
  'اضغط «ربط» لعرض معلومات الكتاب وإكمال الخطوات المطلوبة دون مغادرة اللائحة.': 'Cliquez sur « Lier » pour afficher les informations du livre et terminer les étapes requises sans quitter la liste.',
  'جارٍ تحميل مواد ومقررات هذا المستوى…': 'Chargement des matières et manuels de ce niveau…',
  'إضافة تجهيز إلى مادة': 'Ajouter une fourniture à une matière',
  'أدخل الكتاب أو الدفتر، اربطه بالمادة، وحدد أغلفته قبل الحفظ.': 'Ajoutez le livre ou le cahier, associez-le à la matière et précisez ses couvertures avant d’enregistrer.',
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
  'إعادة الاستعمال': 'Réutilisation',
  'غير محدد': 'Non défini',
  'يمكن إعادة استعماله': 'Peut être réutilisé',
  'لا': 'Non',
  'إضافة إلى المسودة': 'Ajouter au brouillon',
  'جارٍ الربط…': 'Liaison en cours…',
  'تأكيد الربط': 'Confirmer la liaison',
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
  'تم ربط الكتاب بالمقرر بنجاح.': 'Le livre a été lié au manuel avec succès.',

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
  'رَقِيم': 'Raqeem',
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

  'اختر ملف Excel بصيغة .xlsx فقط.': 'Sélectionnez uniquement un fichier Excel au format .xlsx.',
  'تمت معاينة ملف Excel دون تعديل اللائحة.': 'Le fichier Excel a été prévisualisé sans modifier la liste.',
  'تعذرت معاينة ملف Excel.': 'Impossible de prévisualiser le fichier Excel.',
  'تعذر تطبيق ملف Excel.': 'Impossible d’appliquer le fichier Excel.',
  'تم تنزيل نموذج Excel الرسمي.': 'Le modèle Excel officiel a été téléchargé.',
  'تعذر تنزيل نموذج Excel.': 'Impossible de télécharger le modèle Excel.',
  'تم إرفاق الوثيقة بالمسودة.': 'Le document a été joint au brouillon.',
  'تعذر رفع المرفق.': 'Impossible de téléverser la pièce jointe.',
  'تعذرت الطباعة.': 'Impossible d’imprimer.',
  'أُنشئ الرابط لكن لم يصل رمز المشاركة القابل للنسخ.': 'Le lien a été créé, mais le jeton de partage copiable n’a pas été reçu.',
  'تم تدوير الرابط. الرابط السابق لم يعد صالحًا.': 'Le lien a été renouvelé. L’ancien lien n’est plus valide.',
  'تم إنشاء رابط القراءة.': 'Le lien de consultation a été créé.',
  'تعذر إنشاء رابط المشاركة.': 'Impossible de créer le lien de partage.',
  'تم إبطال رابط المشاركة.': 'Le lien de partage a été révoqué.',
  'تعذر إبطال رابط المشاركة.': 'Impossible de révoquer le lien de partage.',
  'تم نسخ رابط اللائحة.': 'Le lien de la liste a été copié.',
  'تعذرت مشاركة الرابط. يمكنك نسخه يدويًا.': 'Impossible de partager le lien. Vous pouvez le copier manuellement.',
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
  'عنصر': 'Article',
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

  'تعذر تحميل لغات التدريس لهذا السياق. حاول مرة أخرى.': 'Impossible de charger les langues d’enseignement pour ce contexte. Réessayez.',
  'لا توجد لغة تدريس متاحة لهذا المستوى والمادة. راجع الإعداد الأكاديمي.': 'Aucune langue d’enseignement n’est disponible pour ce niveau et cette matière. Vérifiez la configuration académique.',
  'حدد المادة لربط الكتاب.': 'Sélectionnez la matière afin de lier le livre.',
  'حدد لغة التدريس لربط الكتاب.': 'Sélectionnez la langue d’enseignement afin de lier le livre.',
  'اختر المرجع المعتمد للمتابعة.': 'Choisissez la référence homologuée pour continuer.',
  'اختر المقرر المطلوب للمتابعة.': 'Choisissez le manuel souhaité pour continuer.',
  'حدد لغة التدريس لإكمال الربط.': 'Sélectionnez la langue d’enseignement pour terminer la liaison.',
  'حدد المادة لإكمال الربط.': 'Sélectionnez la matière pour terminer la liaison.',
  'توجد عدة إعدادات أكاديمية متشابهة. راجع المقررات المعتمدة قبل المتابعة.': 'Plusieurs configurations académiques similaires existent. Vérifiez les manuels homologués avant de continuer.',
  'وجدنا أكثر من مرجع مطابق. اختر المرجع المعتمد.': 'Plusieurs références correspondantes ont été trouvées. Choisissez la référence homologuée.',
  'وجدنا أكثر من مقرر مطابق. اختر المقرر المطلوب.': 'Plusieurs manuels correspondants ont été trouvés. Choisissez le manuel souhaité.',
  'يوجد إعداد أكاديمي متعارض لهذا الكتاب. راجع المقررات المعتمدة.': 'Une configuration académique conflictuelle existe pour ce livre. Vérifiez les manuels homologués.',
  'لا تملك الصلاحيات الأكاديمية اللازمة لربط هذا الكتاب.': 'Vous ne disposez pas des autorisations académiques nécessaires pour lier ce livre.',
  'تعذر الاتصال بالخادم. احتفظنا باختياراتك ويمكنك المحاولة مجددًا.': 'Impossible de contacter le serveur. Vos choix ont été conservés et vous pouvez réessayer.',
  'تعذر ربط الكتاب بالمقرر.': 'Impossible de lier le livre au manuel.',
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

type PatternReplacement = [RegExp, (...matches: string[]) => string];

const FRENCH_PATTERNS: PatternReplacement[] = [
  [/^السنة الدراسية:\s*(.+)$/u, (_all, year) => `Année scolaire : ${year}`],
  [/^(\d+)\s+تحتاج إلى ربط$/u, (_all, count) => `${count} à lier`],
  [/^(\d+)\s+كتابًا يحتاج إلى ربط$/u, (_all, count) => `${count} livre${count === '1' ? '' : 's'} à lier`],
  [/^تم النشر مع\s+(\d+)\s+تنبيه\.$/u, (_all, count) => `Publication effectuée avec ${count} avertissement${count === '1' ? '' : 's'}.`],
  [/^حذف «(.+)» من هذه المسودة\؟$/u, (_all, name) => `Supprimer « ${name} » de ce brouillon ?`],
  [/^ربط «(.+)» بالمقرر$/u, (_all, name) => `Lier « ${name} » au manuel`],
  [/^اختر مادة مفعلة في (.+)، ثم المقرر المعتمد إن وُجد\.$/u, (_all, level) => `Choisissez une matière activée pour ${level}, puis le manuel homologué s’il existe.`],
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
  [/^راجع الصفوف:\s*(.+)\. هذا تنبيه واجهة فقط؛ Odoo يبقى صاحب قرار التطبيق\.$/u, (_all, rows) => `Vérifiez les lignes : ${rows}. Il s’agit uniquement d’un avertissement d’interface ; Odoo reste responsable de la décision d’application.`],
  [/^الصف\s+(\d+):\s*(.+)$/u, (_all, row, name) => `Ligne ${row} : ${name}`],
  [/^طُبق\s+(\d+)\s+صفًا$/u, (_all, count) => `${count} lignes appliquées`],
  [/^تعذر تطبيق\s+(\d+)، ويحتاج المراجعة\s+(\d+)\. لم يتم نشر اللائحة\.$/u, (_all, blocked, review) => `${blocked} non appliquées, ${review} à vérifier. La liste n’a pas été publiée.`],
  [/^تم تطبيق\s+(\d+)\s+صفًا على المسودة\. لم يتم نشر اللائحة\.$/u, (_all, count) => `${count} lignes ont été appliquées au brouillon. La liste n’a pas été publiée.`],
];

function translateCore(core: string): string {
  const exact = FRENCH_EXACT[core];
  if (exact) return exact;
  for (const [pattern, replacement] of FRENCH_PATTERNS) {
    const match = core.match(pattern);
    if (match) return replacement(...match);
  }
  return core;
}

export function translateEntryRequirementsLegacyText(value: string): string {
  if (!value) return value;
  const leading = value.match(/^\s*/u)?.[0] ?? '';
  const trailing = value.match(/\s*$/u)?.[0] ?? '';
  const coreEnd = Math.max(leading.length, value.length - trailing.length);
  const core = value.slice(leading.length, coreEnd);
  if (!core) return value;
  const translated = translateCore(core);
  return translated === core ? value : `${leading}${translated}${trailing}`;
}

const TRANSLATED_ATTRIBUTES = ['aria-label', 'placeholder', 'title'] as const;

function textNodesWithin(root: Node): Text[] {
  if (root.nodeType === Node.TEXT_NODE) return [root as Text];
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

function elementsWithin(root: Node): Element[] {
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return [];
  const elements: Element[] = [];
  if (root.nodeType === Node.ELEMENT_NODE) elements.push(root as Element);
  elements.push(...Array.from((root as ParentNode).querySelectorAll?.('*') ?? []));
  return elements;
}

export function EntryRequirementsLocalizationBoundary({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const textOriginals = useRef(new Map<Text, string>());
  const attributeOriginals = useRef(new Map<Element, Map<string, string>>());

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const restoreTracked = () => {
      for (const [node, original] of textOriginals.current) {
        if (node.isConnected && node.data !== original) node.data = original;
      }
      for (const [element, attributes] of attributeOriginals.current) {
        if (!element.isConnected) continue;
        for (const [name, original] of attributes) {
          if (element.getAttribute(name) !== original) element.setAttribute(name, original);
        }
      }
      textOriginals.current.clear();
      attributeOriginals.current.clear();
    };

    restoreTracked();
    if (locale !== 'fr') return restoreTracked;

    const localizeText = (node: Text) => {
      const parent = node.parentElement;
      if (parent?.closest('script, style, code, pre')) return;
      const original = textOriginals.current.get(node) ?? node.data;
      if (!textOriginals.current.has(node)) textOriginals.current.set(node, original);
      const translated = translateEntryRequirementsLegacyText(original);
      if (node.data !== translated) node.data = translated;
    };

    const localizeElement = (element: Element) => {
      if (element.closest('script, style, code, pre')) return;
      for (const attribute of TRANSLATED_ATTRIBUTES) {
        const current = element.getAttribute(attribute);
        if (!current) continue;
        let attributes = attributeOriginals.current.get(element);
        if (!attributes) {
          attributes = new Map<string, string>();
          attributeOriginals.current.set(element, attributes);
        }
        const original = attributes.get(attribute) ?? current;
        if (!attributes.has(attribute)) attributes.set(attribute, original);
        const translated = translateEntryRequirementsLegacyText(original);
        if (current !== translated) element.setAttribute(attribute, translated);
      }

      if (element instanceof HTMLInputElement && element.type === 'text' && element.value === 'تجهيزات الدخول المدرسي') {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(element, 'Fournitures de rentrée');
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    const localizeTree = (node: Node) => {
      for (const text of textNodesWithin(node)) localizeText(text);
      for (const element of elementsWithin(node)) localizeElement(element);
    };

    localizeTree(root);

    const rootObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') localizeText(mutation.target as Text);
        if (mutation.type === 'attributes' && mutation.target instanceof Element) localizeElement(mutation.target);
        for (const node of mutation.addedNodes) localizeTree(node);
      }
    });
    rootObserver.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATED_ATTRIBUTES],
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
      rootObserver.disconnect();
      portalObserver.disconnect();
      window.confirm = originalConfirm;
      restoreTracked();
    };
  }, [locale]);

  return <div ref={rootRef} style={{ display: 'contents' }}>{children}</div>;
}
