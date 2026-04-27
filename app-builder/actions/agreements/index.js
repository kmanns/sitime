'use strict';

const SIGNED_API_STATUSES = new Set([
  'SIGNED', 'APPROVED', 'COMPLETED', 'ARCHIVED',
]);

function corsHeaders(allowedOrigin) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  };
}

function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  };
}

function parseBody(params) {
  if (params.__ow_body) {
    try {
      return JSON.parse(Buffer.from(params.__ow_body, 'base64').toString('utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

async function getLatestWidgetAgreement(apiBase, accessToken, widgetId) {
  const url = `${apiBase}/widgets/${encodeURIComponent(widgetId)}/agreements?pageSize=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Acrobat Sign API error ${res.status}`);
  }

  const data = await res.json();
  return (data.userAgreementList || [])[0] || null;
}

async function main(params) {
  const method = (params.__ow_method || 'get').toLowerCase();
  const cors = corsHeaders(params.ALLOWED_ORIGIN);

  if (method === 'options') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  if (method === 'post') {
    const webformUrl = params.ACROBAT_SIGN_WEBFORM_URL;
    if (!webformUrl) {
      return jsonResponse(500, { error: 'ACROBAT_SIGN_WEBFORM_URL is not configured' }, cors);
    }

    return jsonResponse(200, {
      agreementId: 'demo-webform-session',
      status: 'pending',
      signingUrl: webformUrl,
    }, cors);
  }

  if (method === 'get') {
    // Path: /api/v1/web/sitime-checkout/agreements/{agreementId}
    // __ow_path will be "/{agreementId}" — extract it
    const agreementId = (params.__ow_path || '').replace(/^\//, '') || params.agreementId || '';

    const { ACROBAT_SIGN_API_BASE, ACROBAT_SIGN_ACCESS_TOKEN, ACROBAT_SIGN_WIDGET_ID } = params;

    // If Sign API credentials are present, look up real status
    if (ACROBAT_SIGN_API_BASE && ACROBAT_SIGN_ACCESS_TOKEN && ACROBAT_SIGN_WIDGET_ID) {
      try {
        const latest = await getLatestWidgetAgreement(
          ACROBAT_SIGN_API_BASE,
          ACROBAT_SIGN_ACCESS_TOKEN,
          ACROBAT_SIGN_WIDGET_ID,
        );

        if (latest && SIGNED_API_STATUSES.has(latest.status)) {
          return jsonResponse(200, {
            agreementId: agreementId || latest.id,
            status: 'signed',
            signedAt: latest.completedDate || latest.createdDate || null,
          }, cors);
        }
      } catch (err) {
        // Sign API unavailable — fall through to pending
        console.error('Sign API check failed:', err.message);
      }
    }

    return jsonResponse(200, {
      agreementId: agreementId || 'demo-webform-session',
      status: 'pending',
    }, cors);
  }

  return jsonResponse(405, { error: 'Method not allowed' }, cors);
}

module.exports = { main };
