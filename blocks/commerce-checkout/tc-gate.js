let tcAccepted = false;

const TC_HTML = `
<h2 class="checkout-tc-gate__title">SiTime – End-Use and End-User Certification</h2>
<p class="checkout-tc-gate__effective"><em>Effective Upon Customer Acceptance</em></p>
<p>By clicking "I Agree", I acknowledge, understand, and agree on behalf of myself and my organization (collectively, "Customer") that any access to, purchase of, or use of products, materials, software, technical data, technology, services, or support provided by SiTime Corporation ("SiTime Items") is subject to the following terms and conditions related to export controls, sanctions, and trade compliance.</p>

<h3>1. Compliance With U.S. and Applicable Export Controls</h3>
<p>Customer agrees that all SiTime Items will be handled in full compliance with all applicable export control and sanctions laws, including but not limited to:</p>
<ul>
  <li>U.S. Export Administration Regulations (EAR)</li>
  <li>U.S. Department of the Treasury, Office of Foreign Assets Control (OFAC) regulations</li>
  <li>U.S. Department of State regulations, including the International Traffic in Arms Regulations (ITAR) where applicable</li>
  <li>Import, export, and sanctions regulations of any jurisdiction to which Customer is subject</li>
</ul>
<p>Customer certifies that it will not transfer, export, re-export, release, or otherwise make available any SiTime Items contrary to any applicable law or regulation.</p>

<h3>2. Screening of Transaction Parties</h3>
<p>Customer agrees that all parties involved in any transaction, delivery, or onward sale will be screened against:</p>
<ul>
  <li>The U.S. Government Consolidated Screening List (CSL)</li>
  <li>The BIS Denied Persons List, Entity List, Unverified List, and MEU List</li>
  <li>OFAC's SDN, SDT, SSI, and NS-CMIC/CMIC lists, including entities owned 50% or more, directly or indirectly, by listed persons</li>
  <li>U.S. Department of State Debarred Parties</li>
  <li>Any applicable U.S. and non-U.S. restricted party or sanctions lists</li>
</ul>
<p>Customer agrees not to transact with, or transfer SiTime Items to, any restricted or prohibited party or destination.</p>

<h3>3. Prohibited End Uses</h3>
<p>Customer certifies that SiTime Items will NOT be used directly or indirectly for:</p>
<ul>
  <li>Development, production, or use of nuclear weapons, chemical weapons, biological weapons, or associated delivery systems</li>
  <li>Development, production, or use of missiles or unmanned aerial vehicles (UAVs) capable of a range of 300 km or greater, or where the range is uncertain</li>
  <li>Military, security, intelligence, or reconnaissance activities of any foreign government or military organization, including but not limited to those of Russia, Belarus, China, Venezuela, Nicaragua, Burma/Myanmar, or any other jurisdiction subject to U.S. military or proliferation restrictions</li>
</ul>

<h3>4. Prohibited Destinations</h3>
<p>Customer certifies that SiTime Items will not be exported, re-exported, transferred, or used in:</p>
<ul>
  <li>Russia or Belarus</li>
  <li>Crimea, Luhansk, Donetsk, or any other temporarily occupied or restricted regions of Ukraine</li>
  <li>Any other country or region subject to comprehensive U.S. sanctions, embargo, or territorial restrictions</li>
</ul>
<p>Customer shall not route shipments through prohibited territories or engage in evasive transshipment practices.</p>

<h3>5. Licensing and Authorizations</h3>
<p>If a U.S. export license, re-export authorization, or other governmental approval is required for any transaction involving SiTime Items:</p>
<ul>
  <li>Customer shall obtain the required authorization prior to any export, re-export, or transfer.</li>
  <li>Customer shall provide SiTime written notice of any required authorization.</li>
  <li>Customer shall notify SiTime if end-use, end-user, or destination changes.</li>
  <li>Customer agrees not to proceed with any shipment or transaction unless fully authorized.</li>
</ul>

<h3>6. Diversion, Red Flags, and Misrepresentation</h3>
<p>Customer agrees that:</p>
<ul>
  <li>No SiTime Items will be diverted from the declared end user, end use, or destination.</li>
  <li>Customer will actively monitor for and report any red flags indicating unauthorized end use or diversion.</li>
  <li>Customer will not conceal or misrepresent any fact relevant to export controls.</li>
</ul>

<h3>7. Obligations for Resellers, Distributors, and Intermediaries</h3>
<p>Customer agrees that:</p>
<ul>
  <li>All downstream recipients of SiTime Items will be informed of these compliance obligations.</li>
  <li>Customer will ensure that its resellers, affiliates, subcontractors, logistics providers, and representatives adhere to these requirements.</li>
  <li>Customer accepts responsibility for onward transfers arranged by Customer or its agents.</li>
</ul>

<h3>8. Notification Requirement</h3>
<p>Customer will notify SiTime Global Trade Compliance at <a href="mailto:tradecompliance@sitime.com">tradecompliance@sitime.com</a> immediately and in writing of any:</p>
<ul>
  <li>Change in end use, end user, or destination</li>
  <li>Change in ownership, screening status, sanctions exposure, or control of Customer</li>
  <li>Government inquiry, enforcement activity, or suspected violation involving SiTime Items</li>
</ul>

<h3>9. Authority to Bind the Organization</h3>
<p>Customer certifies that the individual accepting this agreement is:</p>
<ul>
  <li>Duly authorized to make binding legal certifications on behalf of the organization</li>
  <li>Fully responsible for ensuring compliance with this certification</li>
</ul>

<h3>Customer Acknowledgment</h3>
<p>By clicking "I Agree," Customer certifies that it has carefully read, understands, and agrees to all terms set forth above, and that all statements made are true, accurate, and complete. False statements may constitute violations of U.S. law.</p>
`;

export function isAlreadyAccepted() {
  return tcAccepted;
}

export function renderTcGate(container, { onAccept }) {
  const wrapper = document.createElement('section');
  wrapper.className = 'checkout-tc-gate';
  wrapper.dataset.testid = 'checkout-tc-gate';

  const body = document.createElement('div');
  body.className = 'checkout-tc-gate__body';
  body.innerHTML = TC_HTML;

  const footer = document.createElement('div');
  footer.className = 'checkout-tc-gate__footer';

  const checkboxId = 'checkout-tc-gate-checkbox';

  const label = document.createElement('label');
  label.className = 'checkout-tc-gate__label';
  label.htmlFor = checkboxId;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'checkout-tc-gate__checkbox';
  checkbox.id = checkboxId;

  const labelText = document.createElement('span');
  labelText.textContent = 'I have read and understood this End-Use and End-User Certification and agree to its terms.';

  label.append(checkbox, labelText);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'checkout-tc-gate__button';
  button.textContent = 'I Agree';
  button.disabled = true;

  checkbox.addEventListener('change', () => {
    button.disabled = !checkbox.checked;
  });

  button.addEventListener('click', () => {
    if (!checkbox.checked) return;
    tcAccepted = true;
    wrapper.remove();
    onAccept();
  });

  footer.append(label, button);
  wrapper.append(body, footer);
  container.append(wrapper);

  return wrapper;
}
