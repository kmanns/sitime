export default async function decorate(block) {
  const rows = [...block.children];
  if (rows.length < 2) return;

  // Row 0 is the header row (heading + browse link)
  const headerRow = rows[0];
  const headerCells = [...headerRow.children];

  // Build header
  const header = document.createElement('div');
  header.className = 'carousel-header';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'carousel-header-left';

  const h2 = headerCells[0]?.querySelector('h2');
  if (h2) headerLeft.appendChild(h2);

  // Build subtitle line: "Looking to buy? Shop Now →"
  const subtitleP = headerCells[0]?.querySelector('p');
  if (subtitleP) {
    subtitleP.classList.add('subtitle');
    headerLeft.appendChild(subtitleP);
  }

  header.appendChild(headerLeft);

  // Browse All Products button (right side)
  if (headerCells[1]) {
    const browseDiv = document.createElement('div');
    browseDiv.className = 'browse-all';
    const browseContainer = headerCells[1].querySelector('.button-container');
    if (browseContainer) {
      browseDiv.appendChild(browseContainer);
    } else {
      const browseLink = headerCells[1].querySelector('a');
      if (browseLink) {
        browseDiv.appendChild(browseLink);
      }
    }
    header.appendChild(browseDiv);
  }

  // Navigation arrows
  const nav = document.createElement('div');
  nav.className = 'carousel-nav';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '\u2039';
  prevBtn.setAttribute('aria-label', 'Previous');
  prevBtn.disabled = true;

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '\u203A';
  nextBtn.setAttribute('aria-label', 'Next');

  nav.appendChild(prevBtn);
  nav.appendChild(nextBtn);

  // Build card track
  const trackContainer = document.createElement('div');
  trackContainer.className = 'carousel-track-container';

  const track = document.createElement('div');
  track.className = 'carousel-track';

  // Rows 1+ are cards
  const cardRows = rows.slice(1);
  cardRows.forEach((row) => {
    const cells = [...row.children];
    const card = document.createElement('div');
    card.className = 'carousel-card';

    // Cell 0: image
    const imgCell = cells[0];
    if (imgCell) {
      const pic = imgCell.querySelector('picture');
      if (pic) card.appendChild(pic);
    }

    // Cell 1: text content (h3, p, ul)
    const textCell = cells[1];
    if (textCell) {
      const h3 = textCell.querySelector('h3');
      if (h3) card.appendChild(h3);
      const p = textCell.querySelector('p');
      if (p) card.appendChild(p);
      const ul = textCell.querySelector('ul');
      if (ul) card.appendChild(ul);
    }

    track.appendChild(card);
  });

  trackContainer.appendChild(track);

  // Clear block and rebuild
  block.textContent = '';
  block.appendChild(header);
  block.appendChild(nav);
  block.appendChild(trackContainer);

  // Carousel navigation logic
  let currentIndex = 0;
  const cardWidth = 440;
  const gap = 30;

  function updateCarousel() {
    const offset = currentIndex * (cardWidth + gap);
    track.style.transform = `translateX(-${offset}px)`;
    prevBtn.disabled = currentIndex === 0;

    const containerWidth = trackContainer.offsetWidth;
    const totalCards = cardRows.length;
    const visibleCards = Math.floor(containerWidth / (cardWidth + gap));
    nextBtn.disabled = currentIndex >= totalCards - visibleCards;
  }

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex -= 1;
      updateCarousel();
    }
  });

  nextBtn.addEventListener('click', () => {
    const containerWidth = trackContainer.offsetWidth;
    const totalCards = cardRows.length;
    const visibleCards = Math.floor(containerWidth / (cardWidth + gap));
    if (currentIndex < totalCards - visibleCards) {
      currentIndex += 1;
      updateCarousel();
    }
  });

  updateCarousel();
}
