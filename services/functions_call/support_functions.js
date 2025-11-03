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
    return {
      id,
      name,
      description: job?.description ?? job?.desc ?? '',
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
  buildJobUrl
};


