const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const FILE_NAME = 'homesd_data.json';
const CACHED_FILE_ID_KEY = 'homesd_drive_file_id';

const DEFAULT_DATA = {
  transactions: [],
  budgetOverrides: {},
  lastSync: '',
};

export function saveAccessToken(token) {
  sessionStorage.setItem('google_access_token', token);
}

export function getAccessToken() {
  return sessionStorage.getItem('google_access_token');
}

export function clearAccessToken() {
  sessionStorage.removeItem('google_access_token');
  sessionStorage.removeItem(CACHED_FILE_ID_KEY);
}

async function getFileId(accessToken) {
  const cached = sessionStorage.getItem(CACHED_FILE_ID_KEY);
  if (cached) return cached;

  const searchRes = await fetch(
    `${DRIVE_FILES_API}?q=name%3D'${FILE_NAME}'+and+trashed%3Dfalse&fields=files(id%2Cname)&spaces=drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!searchRes.ok) {
    const err = await searchRes.json();
    throw new Error(`Drive search error: ${err.error?.message || searchRes.status}`);
  }

  const { files } = await searchRes.json();

  if (files && files.length > 0) {
    sessionStorage.setItem(CACHED_FILE_ID_KEY, files[0].id);
    return files[0].id;
  }

  // Crear archivo si no existe
  const boundary = 'homesd_boundary_' + Date.now();
  const metadata = JSON.stringify({ name: FILE_NAME, mimeType: 'application/json' });
  const body = JSON.stringify({ ...DEFAULT_DATA, lastSync: new Date().toISOString() });

  const multipart = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    body,
    `--${boundary}--`,
  ].join('\r\n');

  const createRes = await fetch(`${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipart,
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(`Drive create error: ${err.error?.message || createRes.status}`);
  }

  const { id } = await createRes.json();
  sessionStorage.setItem(CACHED_FILE_ID_KEY, id);
  return id;
}

export async function readFromDrive() {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error('No hay sesión de Google activa');

  const fileId = await getFileId(accessToken);

  const res = await fetch(`${DRIVE_FILES_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearAccessToken();
      throw new Error('TOKEN_EXPIRED');
    }
    throw new Error(`Drive read error: ${res.status}`);
  }

  return await res.json();
}

export async function writeToDrive(data) {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error('No hay sesión de Google activa');

  const fileId = await getFileId(accessToken);

  const payload = {
    transactions: data.transactions ?? [],
    budgetOverrides: data.budgetOverrides ?? {},
    lastSync: new Date().toISOString(),
  };

  const res = await fetch(
    `${DRIVE_UPLOAD_API}/${fileId}?uploadType=media&fields=id`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload, null, 2),
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      clearAccessToken();
      throw new Error('TOKEN_EXPIRED');
    }
    const err = await res.json();
    throw new Error(`Drive write error: ${err.error?.message || res.status}`);
  }

  return payload.lastSync;
}
