const AGREEMENT_SESSION_KEY = 'commerce-checkout-agreement';
const SIGNED_STATUSES = new Set(['signed', 'approved', 'completed', 'complete']);
const ACTIVE_STATUSES = new Set(['creating', 'ready', 'pending', 'viewed', 'sent']);

const DEFAULT_CONFIG = Object.freeze({
  enabled: false,
  displayMode: 'inline',
  serviceBaseUrl: '',
  templateId: '',
  createPath: '/agreements',
  statusPath: '/agreements/{agreementId}',
  pollIntervalMs: 5000,
  title: 'Signature required before placing your order',
  description: 'Review and sign the required agreement to continue checkout.',
  buttonLabel: 'Review and sign',
  resumeLabel: 'Resume signing',
  statusLabel: 'Awaiting signature',
  signedLabel: 'Agreement signed',
  errorLabel: 'You must sign the required agreement before placing your order.',
  checkingLabel: 'Checking agreement status...',
});

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  return String(value).trim().toLowerCase() === 'true';
}

function normalizeDisplayMode(value) {
  return String(value).trim().toLowerCase() === 'modal' ? 'modal' : 'inline';
}

function normalizeText(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'idle';
  if (SIGNED_STATUSES.has(normalized)) return 'signed';
  if (ACTIVE_STATUSES.has(normalized)) return normalized;
  return normalized;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function buildRequestError(status, payload) {
  if (payload?.error?.message) return new Error(payload.error.message);
  if (payload?.message) return new Error(payload.message);
  return new Error(`Agreement request failed with status ${status}`);
}

function sanitizePath(path, fallback) {
  const value = normalizeText(path, fallback);
  return value.startsWith('/') ? value : `/${value}`;
}

export function normalizeAgreementConfig(rawConfig = {}) {
  return {
    enabled: toBoolean(rawConfig['agreement-enabled'] ?? DEFAULT_CONFIG.enabled),
    displayMode: normalizeDisplayMode(rawConfig['agreement-display-mode']),
    serviceBaseUrl: normalizeText(rawConfig['agreement-service-base-url'], ''),
    templateId: normalizeText(rawConfig['agreement-template-id'], ''),
    createPath: sanitizePath(rawConfig['agreement-create-path'], DEFAULT_CONFIG.createPath),
    statusPath: sanitizePath(rawConfig['agreement-status-path'], DEFAULT_CONFIG.statusPath),
    pollIntervalMs: Number(rawConfig['agreement-poll-interval']) > 0
      ? Number(rawConfig['agreement-poll-interval'])
      : DEFAULT_CONFIG.pollIntervalMs,
    title: normalizeText(rawConfig['agreement-title'], DEFAULT_CONFIG.title),
    description: normalizeText(rawConfig['agreement-description'], DEFAULT_CONFIG.description),
    buttonLabel: normalizeText(rawConfig['agreement-button-label'], DEFAULT_CONFIG.buttonLabel),
    resumeLabel: normalizeText(rawConfig['agreement-resume-label'], DEFAULT_CONFIG.resumeLabel),
    statusLabel: normalizeText(rawConfig['agreement-status-label'], DEFAULT_CONFIG.statusLabel),
    signedLabel: normalizeText(rawConfig['agreement-signed-label'], DEFAULT_CONFIG.signedLabel),
    errorLabel: normalizeText(rawConfig['agreement-error-label'], DEFAULT_CONFIG.errorLabel),
    checkingLabel: normalizeText(rawConfig['agreement-checking-label'], DEFAULT_CONFIG.checkingLabel),
  };
}

function buildAgreementSnapshot(context = {}) {
  const items = (context.cartData?.items || context.checkoutData?.items || [])
    .map((item) => ({
      sku: item.sku || item.product?.sku || item.uid || '',
      quantity: item.quantity || 0,
    }))
    .sort((left, right) => left.sku.localeCompare(right.sku));

  const total = context.checkoutData?.prices?.grandTotal?.value
    ?? context.checkoutData?.prices?.grand_total?.value
    ?? context.cartData?.prices?.grand_total?.value
    ?? context.cartData?.prices?.grandTotal?.value
    ?? null;

  return JSON.stringify({
    cartId: context.cartId || context.checkoutData?.id || context.cartData?.id || null,
    quoteId: context.quoteId || null,
    items,
    total,
  });
}

function buildUrl(baseUrl, path, agreementId = '') {
  const resolvedPath = path.replace('{agreementId}', encodeURIComponent(agreementId));
  return new URL(resolvedPath, `${baseUrl.replace(/\/$/, '')}/`).toString();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'omit',
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw buildRequestError(response.status, payload);
  }

  return payload;
}

function createInitialState(config) {
  if (!config.enabled) {
    return {
      enabled: false,
      isBusy: false,
      status: 'idle',
      agreementId: '',
      signingUrl: '',
      signed: false,
      signedAt: '',
      error: '',
      snapshotKey: '',
    };
  }

  const stored = safeJsonParse(sessionStorage.getItem(AGREEMENT_SESSION_KEY));
  if (!stored) {
    return {
      enabled: true,
      isBusy: false,
      status: 'idle',
      agreementId: '',
      signingUrl: '',
      signed: false,
      signedAt: '',
      error: '',
      snapshotKey: '',
    };
  }

  return {
    enabled: true,
    isBusy: false,
    status: normalizeStatus(stored.status),
    agreementId: stored.agreementId || '',
    signingUrl: stored.signingUrl || '',
    signed: Boolean(stored.signed),
    signedAt: stored.signedAt || '',
    error: '',
    snapshotKey: stored.snapshotKey || '',
  };
}

export function createAgreementController(config) {
  let state = createInitialState(config);
  let pollTimer;
  const listeners = new Set();

  const notify = () => {
    listeners.forEach((listener) => listener({
      ...state,
      displayMode: config.displayMode,
      texts: config,
    }));
  };

  const persist = () => {
    if (!config.enabled) return;
    sessionStorage.setItem(AGREEMENT_SESSION_KEY, JSON.stringify({
      agreementId: state.agreementId,
      signingUrl: state.signingUrl,
      signed: state.signed,
      signedAt: state.signedAt,
      snapshotKey: state.snapshotKey,
      status: state.status,
    }));
  };

  const setState = (patch) => {
    state = {
      ...state,
      ...patch,
      enabled: config.enabled,
    };
    persist();
    notify();
  };

  const clearPolling = () => {
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = undefined;
    }
  };

  const getState = () => ({
    ...state,
    displayMode: config.displayMode,
    texts: config,
  });

  const reset = ({ preserveError = false } = {}) => {
    clearPolling();
    state = {
      enabled: config.enabled,
      isBusy: false,
      status: 'idle',
      agreementId: '',
      signingUrl: '',
      signed: false,
      signedAt: '',
      error: preserveError ? state.error : '',
      snapshotKey: '',
    };
    if (!config.enabled) {
      sessionStorage.removeItem(AGREEMENT_SESSION_KEY);
    } else {
      persist();
    }
    notify();
  };

  const clear = () => {
    clearPolling();
    sessionStorage.removeItem(AGREEMENT_SESSION_KEY);
    state = {
      enabled: config.enabled,
      isBusy: false,
      status: 'idle',
      agreementId: '',
      signingUrl: '',
      signed: false,
      signedAt: '',
      error: '',
      snapshotKey: '',
    };
    notify();
  };

  const applyRemoteState = (payload, snapshotKey = state.snapshotKey) => {
    const nextStatus = normalizeStatus(payload.status);
    const signed = nextStatus === 'signed';

    setState({
      isBusy: false,
      status: nextStatus,
      agreementId: payload.agreementId || payload.id || state.agreementId,
      signingUrl: payload.signingUrl || payload.url || state.signingUrl,
      signed,
      signedAt: payload.signedAt || payload.completedAt || state.signedAt,
      error: '',
      snapshotKey,
    });

    if (signed) {
      clearPolling();
    }
  };

  const ensureConfigured = () => {
    if (!config.serviceBaseUrl) {
      throw new Error('Agreement signing is enabled, but no App Builder service URL is configured.');
    }
  };

  const refreshStatus = async ({ silent = false } = {}) => {
    if (!config.enabled || !state.agreementId) return getState();

    ensureConfigured();

    if (!silent) {
      setState({
        isBusy: true,
        error: '',
      });
    }

    try {
      const payload = await requestJson(buildUrl(
        config.serviceBaseUrl,
        config.statusPath,
        state.agreementId,
      ));
      applyRemoteState(payload);
      return getState();
    } catch (error) {
      setState({
        isBusy: false,
        error: error.message,
      });
      return getState();
    }
  };

  const startPolling = () => {
    if (!config.enabled || !state.agreementId || state.signed || pollTimer) return;

    pollTimer = window.setInterval(() => {
      refreshStatus({ silent: true }).catch(console.error);
    }, config.pollIntervalMs);
  };

  const syncWithContext = async (context = {}) => {
    if (!config.enabled) return getState();

    const snapshotKey = buildAgreementSnapshot(context);
    if (state.snapshotKey && state.snapshotKey !== snapshotKey) {
      reset();
      setState({
        snapshotKey,
      });
      return getState();
    }

    if (!state.snapshotKey && snapshotKey) {
      setState({ snapshotKey });
    }

    if (state.agreementId && !state.signed) {
      startPolling();
    }

    return getState();
  };

  const createAgreement = async (context = {}) => {
    if (!config.enabled) return getState();

    const snapshotKey = buildAgreementSnapshot(context);
    if (state.signed && state.snapshotKey === snapshotKey) {
      return getState();
    }

    ensureConfigured();

    setState({
      isBusy: true,
      status: 'creating',
      error: '',
      snapshotKey,
    });

    try {
      const payload = await requestJson(buildUrl(config.serviceBaseUrl, config.createPath), {
        method: 'POST',
        body: JSON.stringify({
          templateId: config.templateId || undefined,
          cartId: context.cartId || context.checkoutData?.id || context.cartData?.id || undefined,
          quoteId: context.quoteId || undefined,
          checkoutData: context.checkoutData || undefined,
          cartData: context.cartData || undefined,
          returnUrl: window.location.href,
        }),
      });

      applyRemoteState(payload, snapshotKey);
      if (!getState().signed) {
        startPolling();
      }

      return getState();
    } catch (error) {
      setState({
        isBusy: false,
        status: 'idle',
        error: error.message,
      });
      return getState();
    }
  };

  const validate = async (context = {}) => {
    if (!config.enabled) return true;

    await syncWithContext(context);

    if (state.signed) {
      setState({ error: '' });
      return true;
    }

    setState({
      error: config.errorLabel,
    });
    return false;
  };

  const setError = (message) => {
    setState({
      error: message,
    });
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    listener(getState());
    return () => listeners.delete(listener);
  };

  if (state.agreementId && !state.signed) {
    startPolling();
  }

  return {
    config,
    clear,
    createAgreement,
    getState,
    refreshStatus,
    reset,
    setError,
    subscribe,
    syncWithContext,
    validate,
  };
}
