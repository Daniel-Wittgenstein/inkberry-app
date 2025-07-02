function getTemplatePreviewHtml(template) {
  return `
    <div class="st-title">${template.package.name}</div>
    <div class="st-author">by ${template.package.author}</div>
    <div class="st-descr">${template.package.descr}</div>
    <div class="st-version">version: ${template.package.version}</div>
    <div class="st-license">license: ${template.package.license}</div>
    <div class="st-type">type: ${template.templateType}</div>
  `;
}

export default getTemplatePreviewHtml;
