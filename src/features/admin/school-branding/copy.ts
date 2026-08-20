import type { Locale } from '@/lib/i18n/config';

export type SchoolBrandingProfileCopy = {
  identityTitle: string;
  identityDesc: string;
  nameAr: string;
  nameLat: string;
  shortName: string;
  contactTitle: string;
  contactDesc: string;
  street: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  visualTitle: string;
  visualDesc: string;
  documentTitle: string;
  documentDesc: string;
  documentSampleTitle: string;
  invalidField: string;
};

export const SCHOOL_BRANDING_PROFILE_COPY: Record<Locale, SchoolBrandingProfileCopy> = {
  ar: {
    identityTitle: 'هوية المؤسسة',
    identityDesc: 'الاسم المعتمد للمؤسسة كما سيظهر في الواجهات والوثائق.',
    nameAr: 'الاسم بالعربية',
    nameLat: 'الاسم بالحروف اللاتينية',
    shortName: 'الاسم المختصر',
    contactTitle: 'معلومات التواصل',
    contactDesc: 'بيانات المؤسسة المستخدمة في التواصل ورؤوس الوثائق.',
    street: 'العنوان',
    city: 'المدينة',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    website: 'الموقع الإلكتروني',
    visualTitle: 'الهوية البصرية',
    visualDesc: 'ألوان المؤسسة المستخدمة في الواجهات والمعاينات.',
    documentTitle: 'معاينة الوثائق',
    documentDesc: 'معاينة مصغرة لرأس مستند باستخدام بيانات المؤسسة الحالية.',
    documentSampleTitle: 'عنوان المستند',
    invalidField: 'يرجى إدخال قيمة صالحة.',
  },
  en: {
    identityTitle: 'Institution identity',
    identityDesc: 'The institution name as it will appear across interfaces and documents.',
    nameAr: 'Arabic name',
    nameLat: 'Latin-script name',
    shortName: 'Short name',
    contactTitle: 'Contact information',
    contactDesc: 'Institution details used for communication and document headers.',
    street: 'Address',
    city: 'City',
    phone: 'Phone',
    email: 'Email',
    website: 'Website',
    visualTitle: 'Visual identity',
    visualDesc: 'Institution colors used in interfaces and previews.',
    documentTitle: 'Document preview',
    documentDesc: 'A compact document-header preview using the current institution details.',
    documentSampleTitle: 'Document title',
    invalidField: 'Please enter a valid value.',
  },
  fr: {
    identityTitle: 'Identité de l’établissement',
    identityDesc: 'Le nom de l’établissement tel qu’il apparaîtra dans les interfaces et les documents.',
    nameAr: 'Nom en arabe',
    nameLat: 'Nom en caractères latins',
    shortName: 'Nom abrégé',
    contactTitle: 'Coordonnées',
    contactDesc: 'Informations de l’établissement utilisées pour les contacts et les en-têtes de documents.',
    street: 'Adresse',
    city: 'Ville',
    phone: 'Téléphone',
    email: 'E-mail',
    website: 'Site web',
    visualTitle: 'Identité visuelle',
    visualDesc: 'Couleurs de l’établissement utilisées dans les interfaces et les aperçus.',
    documentTitle: 'Aperçu des documents',
    documentDesc: 'Aperçu compact d’un en-tête de document avec les informations actuelles de l’établissement.',
    documentSampleTitle: 'Titre du document',
    invalidField: 'Veuillez saisir une valeur valide.',
  },
  es: {
    identityTitle: 'Identidad del centro',
    identityDesc: 'El nombre del centro tal como aparecerá en las interfaces y documentos.',
    nameAr: 'Nombre en árabe',
    nameLat: 'Nombre en caracteres latinos',
    shortName: 'Nombre corto',
    contactTitle: 'Información de contacto',
    contactDesc: 'Datos del centro utilizados para el contacto y los encabezados de documentos.',
    street: 'Dirección',
    city: 'Ciudad',
    phone: 'Teléfono',
    email: 'Correo electrónico',
    website: 'Sitio web',
    visualTitle: 'Identidad visual',
    visualDesc: 'Colores del centro utilizados en las interfaces y vistas previas.',
    documentTitle: 'Vista previa de documentos',
    documentDesc: 'Vista compacta del encabezado de un documento con los datos actuales del centro.',
    documentSampleTitle: 'Título del documento',
    invalidField: 'Introduzca un valor válido.',
  },
};
