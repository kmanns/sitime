export default async function decorate(block) {
  const rows = [...block.children];
  const headerRow = rows[0];
  const tabRows = rows.slice(1);

  // Build tabs container
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'tabs-container';

  const tabsList = document.createElement('div');
  tabsList.className = 'tabs-list';

  const imagePanel = document.createElement('div');
  imagePanel.className = 'tab-image';

  tabRows.forEach((row, index) => {
    const cells = [...row.children];
    const textCell = cells[0];
    const imageCell = cells[1];

    // Build tab item
    const tabItem = document.createElement('div');
    tabItem.className = 'tab-item';
    if (index === 0) tabItem.classList.add('active');

    // Extract heading
    const h3 = textCell.querySelector('h3');
    if (h3) {
      tabItem.appendChild(h3.cloneNode(true));
    }

    // Extract description and link
    const descDiv = document.createElement('div');
    descDiv.className = 'tab-description';
    const paragraphs = textCell.querySelectorAll('p');
    paragraphs.forEach((p) => {
      descDiv.appendChild(p.cloneNode(true));
    });
    tabItem.appendChild(descDiv);

    // Store image reference
    const img = imageCell ? imageCell.querySelector('img') : null;
    if (img) {
      tabItem.dataset.imgSrc = img.getAttribute('src');
      tabItem.dataset.imgAlt = img.getAttribute('alt') || '';
    }

    // Click handler
    tabItem.addEventListener('click', () => {
      tabsList.querySelectorAll('.tab-item').forEach((t) => t.classList.remove('active'));
      tabItem.classList.add('active');
      // Update image
      const activeImg = imagePanel.querySelector('img');
      if (activeImg && tabItem.dataset.imgSrc) {
        activeImg.src = tabItem.dataset.imgSrc;
        activeImg.alt = tabItem.dataset.imgAlt;
      }
    });

    tabsList.appendChild(tabItem);
  });

  // Set initial image from first tab
  const firstImg = tabRows[0]?.children[1]?.querySelector('img');
  if (firstImg) {
    const displayImg = document.createElement('img');
    displayImg.src = firstImg.getAttribute('src');
    displayImg.alt = firstImg.getAttribute('alt') || '';
    imagePanel.appendChild(displayImg);
  }

  tabsContainer.appendChild(tabsList);
  tabsContainer.appendChild(imagePanel);

  // Clear block and rebuild
  // Keep header row, remove tab rows, add tabs container
  tabRows.forEach((row) => row.remove());
  block.appendChild(tabsContainer);
}
