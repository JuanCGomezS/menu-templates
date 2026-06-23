import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';

function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

function getOptionalEnv(name) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function readServiceAccountFile(path) {
  const resolvedPath = resolve(process.cwd(), path);

  if (!existsSync(resolvedPath)) {
    throw new Error(`No existe el archivo de cuenta de servicio: ${resolvedPath}.`);
  }

  return JSON.parse(readFileSync(resolvedPath, 'utf8'));
}

function findDefaultServiceAccountPath() {
  const candidates = [
    'scripts/service-account-key.json',
  ];

  return candidates.find((candidate) => existsSync(resolve(process.cwd(), candidate)));
}

function findCredentialPath() {
  const configuredPath = getOptionalEnv('GOOGLE_APPLICATION_CREDENTIALS')
    || getOptionalEnv('FIREBASE_SERVICE_ACCOUNT_PATH');

  if (configuredPath && existsSync(resolve(process.cwd(), configuredPath))) {
    return configuredPath;
  }

  const defaultPath = findDefaultServiceAccountPath();

  if (defaultPath) {
    if (configuredPath) {
      console.warn(
        `Aviso: la ruta configurada (${configuredPath}) no existe. Se usará ${defaultPath}.`
      );
    }

    return defaultPath;
  }

  return configuredPath;
}

function decodeServiceAccount() {
  const encoded = getOptionalEnv('FIREBASE_SERVICE_ACCOUNT_BASE64');

  if (!encoded) {
    return null;
  }

  const json = Buffer.from(encoded, 'base64').toString('utf8');
  return JSON.parse(json);
}

function getCredentialConfig() {
  const encodedServiceAccount = decodeServiceAccount();

  if (encodedServiceAccount) {
    return {
      credential: cert(encodedServiceAccount),
      credentialProjectId: encodedServiceAccount.project_id,
    };
  }

  const credentialsPath = findCredentialPath();
  const credentialsFile = credentialsPath ? readServiceAccountFile(credentialsPath) : null;

  if (credentialsFile) {
    return {
      credential: cert(credentialsFile),
      credentialProjectId: credentialsFile.project_id,
    };
  }

  if (!getOptionalEnv('FIREBASE_USE_APPLICATION_DEFAULT')) {
    throw new Error(
      'No se encontró una cuenta de servicio. Definí FIREBASE_SERVICE_ACCOUNT_PATH en .env o guardá el archivo como firebase-service-account.json, service-account-key.json o scripts/service-account-key.json.'
    );
  }

  return {
    credential: applicationDefault(),
    credentialProjectId: undefined,
  };
}

function validateProjectId({ expectedProjectId, credentialProjectId }) {
  if (!expectedProjectId || !credentialProjectId) {
    return;
  }

  if (expectedProjectId !== credentialProjectId) {
    throw new Error(
      `El proyecto de la credencial (${credentialProjectId}) no coincide con FIREBASE_PROJECT_ID (${expectedProjectId}).`
    );
  }
}

export function getRequiredEnv(name) {
  const value = getOptionalEnv(name);

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }

  return value;
}

export { getOptionalEnv };

export function initializeAdminApp() {
  if (getApps().length > 0) {
    return;
  }

  const { credential, credentialProjectId } = getCredentialConfig();
  const expectedProjectId = getOptionalEnv('FIREBASE_PROJECT_ID') || getOptionalEnv('PUBLIC_FIREBASE_PROJECT_ID');
  const projectId = expectedProjectId || credentialProjectId;

  if (!projectId) {
    throw new Error(
      'No se pudo detectar el proyecto de Firebase. Definí FIREBASE_PROJECT_ID o PUBLIC_FIREBASE_PROJECT_ID en .env.'
    );
  }

  validateProjectId({ expectedProjectId, credentialProjectId });

  initializeApp({
    credential,
    projectId,
  });
}
