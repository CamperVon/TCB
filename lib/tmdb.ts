// TMDb is used to look up actor info by IMDb ID.
// Requires v4 read access token in env: TMDB_API_KEY

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

export type TmdbPersonResult = {
  imdb_id: string;
  name: string;
  age: number | null;
  photo_url: string | null;
  birthday: string | null;
  bio: string | null;
  known_for_department: string | null;
};

export async function searchByName(query: string): Promise<TmdbPersonResult | null> {
  const token = process.env.TMDB_API_KEY;
  if (!token) throw new Error('TMDB_API_KEY not set');

  const searchRes = await fetch(`${TMDB_BASE}/search/person?query=${encodeURIComponent(query)}&include_adult=true`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!searchRes.ok) return null;
  const searchData = await searchRes.json();
  const person = searchData.results?.[0];
  if (!person) return null;

  // Pull full person record for IMDb ID + birthday + bio
  const personRes = await fetch(`${TMDB_BASE}/person/${person.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!personRes.ok) return null;
  const personData = await personRes.json();

  const birthday = personData.birthday || null;
  const age = birthday ? calcAge(birthday) : null;
  const photo = person.profile_path ? `${IMG_BASE}${person.profile_path}` : null;

  return {
    imdb_id: personData.external_ids?.imdb_id || '',
    name: person.name,
    age,
    photo_url: photo,
    birthday,
    bio: personData.biography || null,
    known_for_department: personData.known_for_department || null,
  };
}

export async function lookupByImdbId(imdbId: string): Promise<TmdbPersonResult | null> {
  const token = process.env.TMDB_API_KEY;
  if (!token) throw new Error('TMDB_API_KEY not set');

  const cleanId = imdbId.trim().startsWith('nm') ? imdbId.trim() : 'nm' + imdbId.trim();

  // Step 1: find TMDb person ID via /find
  const findRes = await fetch(`${TMDB_BASE}/find/${cleanId}?external_source=imdb_id`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 * 60 * 24 }, // cache for a day
  });
  if (!findRes.ok) return null;
  const findData = await findRes.json();
  const person = findData.person_results?.[0];
  if (!person) return null;

  // Step 2: pull full person record for birthday + bio
  const personRes = await fetch(`${TMDB_BASE}/person/${person.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!personRes.ok) return null;
  const personData = await personRes.json();

  const birthday = personData.birthday || null;
  const age = birthday ? calcAge(birthday) : null;
  const photo = person.profile_path ? `${IMG_BASE}${person.profile_path}` : null;

  return {
    imdb_id: cleanId,
    name: person.name,
    age,
    photo_url: photo,
    birthday,
    bio: personData.biography || null,
    known_for_department: personData.known_for_department || null,
  };
}

function calcAge(isoDate: string): number {
  const dob = new Date(isoDate);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}
