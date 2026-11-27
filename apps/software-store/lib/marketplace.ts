export const SPORTS_SLUG = "met-sport";
export const SPORTS_TITLE = "ระบบบริหารจัดการแข่งขันกีฬาสีภายในโรงเรียน";
export const DOCS = "/school-systems#procurement";
export const LINE = "https://lin.ee/Vgg2m3N";
export const QUOTE = "/contact#quote";
export const productTitle = (slug: string, name: string) => slug === SPORTS_SLUG ? SPORTS_TITLE : name;
export const pinSports = (a: {slug: string}, b: {slug: string}) => Number(b.slug === SPORTS_SLUG) - Number(a.slug === SPORTS_SLUG);
export const quoteFor = (slug: string) => `/contact?product=${encodeURIComponent(slug)}#quote`;
