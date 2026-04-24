import createModal from '../modal/modal.js';

function formatSignedAt(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString();
}

function createActionButton(label, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

export function renderAgreementGate(container, { controller, getContext }) {
  let inlineFrameVisible = false;
  let modal;

  const wrapper = document.createElement('section');
  wrapper.className = 'checkout-agreement';
  wrapper.dataset.testid = 'checkout-agreement-gate';

  const heading = document.createElement('h3');
  heading.className = 'checkout-agreement__title';

  const description = document.createElement('p');
  description.className = 'checkout-agreement__description';

  const statusRow = document.createElement('div');
  statusRow.className = 'checkout-agreement__status-row';

  const statusPill = document.createElement('span');
  statusPill.className = 'checkout-agreement__status';
  statusPill.dataset.testid = 'checkout-agreement-status';

  const statusMeta = document.createElement('span');
  statusMeta.className = 'checkout-agreement__meta';

  statusRow.append(statusPill, statusMeta);

  const actionRow = document.createElement('div');
  actionRow.className = 'checkout-agreement__actions';

  const primaryButton = createActionButton('', 'checkout-agreement__button', async () => {
    const state = await controller.createAgreement(getContext());
    if (!state.signingUrl) {
      controller.setError(state.error || 'Unable to start the agreement signing flow.');
      return;
    }

    if (state.displayMode === 'modal') {
      inlineFrameVisible = false;
      if (modal) {
        modal.removeModal();
        modal = null;
      }

      const modalContent = document.createElement('div');
      modalContent.className = 'checkout-agreement__modal';

      const modalHeading = document.createElement('h4');
      modalHeading.className = 'checkout-agreement__modal-title';
      modalHeading.textContent = state.texts.title;

      const modalLink = document.createElement('a');
      modalLink.className = 'checkout-agreement__modal-link';
      modalLink.href = state.signingUrl;
      modalLink.target = '_blank';
      modalLink.rel = 'noreferrer';
      modalLink.textContent = 'Open in a new tab';

      const frame = document.createElement('iframe');
      frame.className = 'checkout-agreement__frame checkout-agreement__frame--modal';
      frame.dataset.testid = 'checkout-agreement-modal-frame';
      frame.src = state.signingUrl;
      frame.title = state.texts.title;

      modalContent.append(modalHeading, modalLink, frame);
      modal = await createModal([modalContent]);
      modal.showModal();
      return;
    }

    inlineFrameVisible = true;
    controller.syncWithContext(getContext()).catch(console.error);
  });

  const refreshButton = createActionButton('Check status', 'checkout-agreement__button checkout-agreement__button--secondary', () => {
    controller.refreshStatus().catch(console.error);
  });

  actionRow.append(primaryButton, refreshButton);

  const error = document.createElement('p');
  error.className = 'checkout-agreement__error';
  error.dataset.testid = 'checkout-agreement-error';

  const frameWrapper = document.createElement('div');
  frameWrapper.className = 'checkout-agreement__frame-wrapper';

  const frameLink = document.createElement('a');
  frameLink.className = 'checkout-agreement__frame-link';
  frameLink.target = '_blank';
  frameLink.rel = 'noreferrer';
  frameLink.textContent = 'Open signing window in a new tab';

  const frame = document.createElement('iframe');
  frame.className = 'checkout-agreement__frame';
  frame.dataset.testid = 'checkout-agreement-frame';

  frameWrapper.append(frameLink, frame);

  wrapper.append(heading, description, statusRow, actionRow, error, frameWrapper);
  container.append(wrapper);

  const render = (state) => {
    wrapper.hidden = !state.enabled;
    if (!state.enabled) return;

    heading.textContent = state.texts.title;
    description.textContent = state.texts.description;
    frame.title = state.texts.title;

    const showInlineFrame = state.displayMode === 'inline'
      && inlineFrameVisible
      && !state.signed
      && Boolean(state.signingUrl);

    frameWrapper.hidden = !showInlineFrame;
    if (showInlineFrame) {
      frame.src = state.signingUrl;
      frameLink.href = state.signingUrl;
    } else {
      frame.removeAttribute('src');
      frameLink.removeAttribute('href');
    }

    if (state.signed) {
      statusPill.textContent = state.texts.signedLabel;
      statusPill.dataset.state = 'signed';
      statusMeta.textContent = formatSignedAt(state.signedAt)
        ? `Completed ${formatSignedAt(state.signedAt)}`
        : 'Agreement captured for this order.';
      primaryButton.textContent = state.texts.signedLabel;
      primaryButton.disabled = true;
      refreshButton.hidden = true;
      inlineFrameVisible = false;

      if (modal) {
        modal.removeModal();
        modal = null;
      }
    } else {
      statusPill.dataset.state = state.status;
      if (state.isBusy) {
        statusPill.textContent = state.texts.checkingLabel;
      } else if (state.agreementId) {
        statusPill.textContent = state.texts.statusLabel;
      } else {
        statusPill.textContent = 'Not started';
      }

      statusMeta.textContent = state.agreementId
        ? `Agreement ID: ${state.agreementId}`
        : 'Start the agreement before placing your order.';

      primaryButton.textContent = state.agreementId
        ? state.texts.resumeLabel
        : state.texts.buttonLabel;
      primaryButton.disabled = state.isBusy;
      refreshButton.hidden = !state.agreementId;
      refreshButton.disabled = state.isBusy;
    }

    error.hidden = !state.error;
    error.textContent = state.error || '';
  };

  const unsubscribe = controller.subscribe(render);

  return {
    remove() {
      unsubscribe();
      if (modal) {
        modal.removeModal();
        modal = null;
      }
      wrapper.remove();
    },
  };
}
