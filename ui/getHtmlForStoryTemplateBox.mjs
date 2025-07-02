function getHtmlForStoryTemplateBox(template, index) {
  return `
    <div class="story-template-name">
      <input type="radio" id="story-templ${index}" name="story-templates" value="${index}">
      <label for="story-templ${index}">${template.package.name}</label>
    </div>
  `;
}

export default getHtmlForStoryTemplateBox;
