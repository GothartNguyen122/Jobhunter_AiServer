// Helper: remove Vietnamese accents (ported to JS)
function nonAccentVietnamese(str) {
  if (!str) return '';
  str = str.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a');
  str = str.replace(/[èéẹẻẽêềếệểễ]/g, 'e');
  str = str.replace(/[ìíịỉĩ]/g, 'i');
  str = str.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o');
  str = str.replace(/[ùúụủũưừứựửữ]/g, 'u');
  str = str.replace(/[ỳýỵỷỹ]/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A');
  str = str.replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E');
  str = str.replace(/[ÌÍỊỈĨ]/g, 'I');
  str = str.replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O');
  str = str.replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, 'U');
  str = str.replace(/[ỲÝỴỶỸ]/g, 'Y');
  str = str.replace(/Đ/g, 'D');
  // Remove combining diacritics
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return str;
}

// Slugify similar to frontend convertSlug
function convertSlug(str) {
  if (!str) return '';
  str = nonAccentVietnamese(str);
  str = str.replace(/^\s+|\s+$/g, '');
  str = str.toLowerCase();

  const from = "ÁÄÂÀÃÅČÇĆĎÉĚËÈÊẼĔȆĞÍÌÎÏİŇÑÓÖÒÔÕØŘŔŠŞŤÚŮÜÙÛÝŸŽáäâàãåčçćďéěëèêẽĕȇğíìîïıňñóöòôõøðřŕšşťúůüùûýÿžþÞĐđßÆa·/_,:;";
  const to =   "AAAAAACCCDEEEEEEEEGIIIIINNOOOOOORRSSTUUUUUYYZaaaaaacccdeeeeeeeegiiiiinnooooooorrsstuuuuuyyzbBDdBAa------";
  for (let i = 0, l = from.length; i < l; i++) {
    const fromChar = from.charAt(i);
    const toChar = to.charAt(i);
    str = str.replace(new RegExp(fromChar, 'g'), toChar);
  }

  str = str
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return str;
}

function buildJobUrl(jobName, jobId) {
  const baseUrl = process.env.FRONTEND_BASE_URL;
  const slug = convertSlug(jobName);
  return `${baseUrl}/job/${slug}?id=${jobId}`;
}

// Strip HTML tags and decode HTML entities while preserving Word-like formatting
function stripHtmlTags(htmlString) {
  if (!htmlString || typeof htmlString !== 'string') return '';
  
  let text = htmlString;
  
  // Step 1: Replace block-level elements with newlines before removing tags
  // Headings - add newline before and after
  text = text.replace(/<\/h([1-6])>/gi, '\n\n');
  text = text.replace(/<h([1-6])[^>]*>/gi, '\n');
  
  // List items - add bullet point and newline
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<\/li>/gi, '');
  
  // Paragraphs and divs - add newline
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<div[^>]*>/gi, '\n');
  
  // Unordered and ordered lists - add newline
  text = text.replace(/<\/ul>/gi, '\n');
  text = text.replace(/<ul[^>]*>/gi, '\n');
  text = text.replace(/<\/ol>/gi, '\n');
  text = text.replace(/<ol[^>]*>/gi, '\n');
  
  // Line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/br>/gi, '\n');
  
  // Step 2: Decode HTML entities
  const htmlEntityMap = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&apos;': "'"
  };
  
  // Decode common HTML entities
  Object.keys(htmlEntityMap).forEach(entity => {
    const regex = new RegExp(entity, 'g');
    text = text.replace(regex, htmlEntityMap[entity]);
  });
  
  // Decode numeric entities (&#123; or &#x7B;)
  text = text.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  text = text.replace(/&#x([a-f\d]+);/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Step 3: Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Step 4: Normalize whitespace but preserve newlines
  // Replace multiple spaces with single space (but keep newlines)
  text = text.replace(/[ \t]+/g, ' ');
  // Replace 3+ newlines with 2 newlines (max 2 blank lines)
  text = text.replace(/\n{3,}/g, '\n\n');
  // Remove spaces at start/end of lines
  text = text.replace(/[ \t]+$/gm, '');
  text = text.replace(/^[ \t]+/gm, '');
  // Trim start and end
  text = text.trim();
  
  return text;
}

// Format tool data from search_job into simplified items with URL
function formatSearchJobResults(toolData) {
  // toolData might be { meta, result } or already an array
  const jobs = Array.isArray(toolData)
    ? toolData
    : (toolData?.result || toolData?.results || []);

  if (!Array.isArray(jobs)) return [];

  return jobs.map((job) => {
    const id = job?.id ?? job?.jobId ?? null;
    const name = job?.name ?? job?.title ?? '';
    const rawDescription = job?.description ?? job?.desc ?? '';
    
    return {
      id,
      name,
      description: stripHtmlTags(rawDescription),
      salary: job?.salary ?? null,
      location: job?.location ?? '',
      level: job?.level ?? '',
      active: job?.active ?? undefined,
      companyName: job?.company?.name ?? job?.companyName ?? '',
      updatedAt: job?.updatedAt ?? job?.updated_at ?? null,
      url: buildJobUrl(name, id)
    };
  });
}

module.exports = {
  convertSlug,
  formatSearchJobResults,
  buildJobUrl,
  stripHtmlTags,
};


