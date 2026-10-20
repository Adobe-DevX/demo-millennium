import { decorateIcons } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const ICONS = ['gift', 'wifi', 'points'];

export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);

    const [iconCell, textCell] = row.children;
    const iconName = iconCell?.textContent.trim().toLowerCase();
    if (ICONS.includes(iconName)) {
      const icon = document.createElement('span');
      icon.className = `icon icon-${iconName}`;
      li.append(icon);
    }

    const label = document.createElement('p');
    if (textCell) {
      moveInstrumentation(textCell, label);
      label.textContent = textCell.textContent.trim();
    }
    li.append(label);
    ul.append(li);
  });

  block.replaceChildren(ul);
  decorateIcons(ul);
}
