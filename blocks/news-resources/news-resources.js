export default async function decorate(block) {
  const rows = [...block.children];
  const container = document.createElement('div');
  container.className = 'cards-container';

  rows.forEach((row) => {
    const cells = [...row.children];
    // cell 0 = image, cell 1 = text content
    const imageCell = cells[0];
    const textCell = cells[1];

    const card = document.createElement('div');
    card.className = 'card';

    // Build image section with type overlay
    const cardImage = document.createElement('div');
    cardImage.className = 'card-image';
    const img = imageCell.querySelector('img');
    if (img) {
      const picture = imageCell.querySelector('picture') || document.createElement('picture');
      if (picture.contains(img)) {
        cardImage.appendChild(picture);
      } else {
        cardImage.appendChild(img);
      }
    }

    // Extract text content
    const paragraphs = [...textCell.querySelectorAll('p')];
    const headings = [...textCell.querySelectorAll('h3')];

    // First paragraph with <strong> is the type/category
    let typeText = '';
    let prefixText = '';
    let description = '';
    let ctaLink = null;

    paragraphs.forEach((p, idx) => {
      const strong = p.querySelector('strong');
      const link = p.querySelector('a');

      if (idx === 0 && strong) {
        typeText = strong.textContent.trim();
      } else if (idx === 1 && !link) {
        prefixText = p.textContent.trim();
      } else if (link && p.classList.contains('button-container')) {
        ctaLink = link;
      } else if (link && !p.classList.contains('button-container')) {
        ctaLink = link;
      } else if (!link && idx > 1) {
        description = p.textContent.trim();
      }
    });

    // Type overlay on image
    if (typeText) {
      const typeEl = document.createElement('span');
      typeEl.className = 'card-type';
      typeEl.textContent = typeText;
      cardImage.appendChild(typeEl);
    }

    card.appendChild(cardImage);

    // Build card body
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    if (prefixText) {
      const prefix = document.createElement('p');
      prefix.className = 'card-prefix';
      prefix.textContent = prefixText;
      cardBody.appendChild(prefix);
    }

    if (headings.length > 0) {
      const title = document.createElement('h3');
      title.className = 'card-title';
      title.textContent = headings[0].textContent.trim();
      cardBody.appendChild(title);
    }

    if (description) {
      const desc = document.createElement('p');
      desc.className = 'card-description';
      desc.textContent = description;
      cardBody.appendChild(desc);
    }

    if (ctaLink) {
      const ctaContainer = document.createElement('div');
      ctaContainer.className = 'card-cta';
      ctaLink.className = 'button';
      ctaContainer.appendChild(ctaLink);
      cardBody.appendChild(ctaContainer);
    }

    card.appendChild(cardBody);
    container.appendChild(card);
  });

  block.textContent = '';
  block.appendChild(container);
}
