/**
 * Sanitisation HTML — à utiliser systématiquement avant tout
 * `dangerouslySetInnerHTML`.
 *
 * Le jeton de session est stocké dans le localStorage : une injection de script
 * dans un contenu affiché équivaut à un vol de session médecin, donc à un accès
 * à l'ensemble des dossiers. Aucun HTML ne doit être rendu sans passer par une
 * des fonctions ci-dessous.
 *
 * Trois profils, du plus permissif au plus strict :
 *  - sanitizeRichText : documents et modèles rédigés dans l'app (react-quill)
 *  - sanitizeMessage  : contenu d'origine externe (eHealthBox, portail patient)
 *  - sanitizeInline   : chaînes de traduction contenant un peu de balisage
 */
import DOMPurify from 'dompurify';

// Tout lien sortant est neutralisé : pas d'accès à window.opener depuis la
// page cible, et ouverture hors du contexte applicatif.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const BLOCK_TAGS = [
  'p', 'br', 'hr', 'div', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
];

const INLINE_TAGS = ['strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup'];

const TABLE_TAGS = [
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'caption', 'col', 'colgroup',
];

/**
 * Documents et modèles produits dans l'application.
 * `style` est conservé : les modèles d'attestation en dépendent pour la mise en
 * page à l'impression. DOMPurify nettoie le CSS des valeurs dangereuses.
 */
export function sanitizeRichText(html) {
  if (!html) return '';
  return DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS: [...BLOCK_TAGS, ...INLINE_TAGS, ...TABLE_TAGS, 'a', 'img'],
    ALLOWED_ATTR: [
      'href', 'title', 'target', 'rel',
      'src', 'alt', 'width', 'height',
      'colspan', 'rowspan', 'align', 'class', 'style',
    ],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Contenu d'origine externe : message eHealthBox, message du portail patient.
 * Ni `style`, ni `img` — une image distante suffit à signaler à un tiers qu'un
 * message a été ouvert, et à quel moment.
 */
export function sanitizeMessage(html) {
  if (!html) return '';
  return DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS: [...BLOCK_TAGS, ...INLINE_TAGS, ...TABLE_TAGS, 'a'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'colspan', 'rowspan'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Chaînes de traduction interpolées (`<strong>`, `<br>`, un lien).
 * Les valeurs interpolées peuvent provenir d'une carte eID ou d'une saisie.
 */
export function sanitizeInline(html) {
  if (!html) return '';
  return DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS: [...INLINE_TAGS, 'br', 'a', 'span', 'code'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Pour les fenêtres d'impression construites par concaténation de chaînes
 * (`printWindow.document.write`) : échappe une valeur destinée à du texte.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
