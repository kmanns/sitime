export default async function decorate(block) {
  const rows = [...block.children];

  // Build carousel structure
  const track = document.createElement('div');
  track.className = 'testimonials-track';

  rows.forEach((row) => {
    const cells = [...row.children];
    const slide = document.createElement('div');
    slide.className = 'testimonials-slide';

    // Cell 0: logo image
    const logoCell = cells[0];
    if (logoCell) {
      const logoDiv = document.createElement('div');
      logoDiv.className = 'slide-logo';
      logoDiv.innerHTML = logoCell.innerHTML;
      slide.appendChild(logoDiv);
    }

    // Cell 1: quote text
    const quoteCell = cells[1];
    if (quoteCell) {
      const quoteDiv = document.createElement('div');
      quoteDiv.className = 'slide-quote';
      quoteDiv.innerHTML = quoteCell.innerHTML;
      slide.appendChild(quoteDiv);
    }

    // Cell 2: attribution
    const attrCell = cells[2];
    if (attrCell) {
      const attrDiv = document.createElement('div');
      attrDiv.className = 'slide-attribution';
      attrDiv.innerHTML = attrCell.innerHTML;
      slide.appendChild(attrDiv);
    }

    track.appendChild(slide);
  });

  // Clear block and add carousel
  block.textContent = '';

  // Navigation buttons
  const prevBtn = document.createElement('button');
  prevBtn.className = 'testimonials-nav prev';
  prevBtn.setAttribute('aria-label', 'Previous');
  prevBtn.innerHTML = '&#8249;';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'testimonials-nav next';
  nextBtn.setAttribute('aria-label', 'Next');
  nextBtn.innerHTML = '&#8250;';

  block.appendChild(track);
  block.appendChild(prevBtn);
  block.appendChild(nextBtn);

  // Carousel logic
  let currentSlide = 0;
  const slides = track.querySelectorAll('.testimonials-slide');
  const totalSlides = slides.length;

  function updateSlide() {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
  }

  prevBtn.addEventListener('click', () => {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateSlide();
  });

  nextBtn.addEventListener('click', () => {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateSlide();
  });

  updateSlide();
}
