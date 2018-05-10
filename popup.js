const NEW_TEMPLATE_ID = "newTemplateHopeNobodyUseThisName";

// Templates for row
var rowItemTemplate = document.querySelector("#templateItem");
var rowNewTemplate = document.querySelector("#templateNew");

var templates = new Proxy([], {
  set: function(target, property, value) {
    if (property !== "length" && value) {
      console.log(`Adding template row num: ${property} id: ${value.templateId} name: ${value.templateName}`);
      let temp = null;
      if (value.templateId >= 0) {
        // Clone template row
        temp = rowItemTemplate.content;
        temp.querySelector("a").text = value.templateName;
      } else {
        // Clone template new
        temp = rowNewTemplate.content;
      }
      let clone = document.importNode(temp, true);
      clone.querySelector("div").classList.add("alt" + (property % 2));
      clone.querySelector(".rowNum").value = property;
      if (container.children[property]) {
        container.replaceChild(clone, container.children[property]);
      } else {
        container.appendChild(clone);
      }
    } else if (value < target.length) {
      console.log("Deleting last row");
      container.removeChild(container.children[value]);
    }
    return Reflect.set(...arguments);
  },
  get: function(target, property) {
    return Reflect.get(...arguments);
  }
});

var nowHidden = null;

// Show (and hide previous) form
var showForm = function(event) {
  event.preventDefault();
  // Clone form template
  let templateForm = document.querySelector("#templateForm");
  let clone = document.importNode(templateForm.content, true);
  let target = event.target.parentNode;
  // If there is a row currently hiding b/c of form open
  if (nowHidden) {
    nowHidden.style.display = "flex";
    nowHidden.parentNode.removeChild(nowHidden.parentNode.querySelector(".rowForm"));
  }
  // Populate form
  let rowNum = target.querySelector(".rowNum").value;
  clone.querySelector(".rowNum").value = templates[rowNum].templateId;
  clone.querySelector(".templateId").value = templates[rowNum].templateId;
  if (templates[rowNum].templateId !== -1) {
    clone.querySelector(".templateName").value = templates[rowNum].templateName;
    clone.querySelector(".templateBody").value = templates[rowNum].templateBody;
  }
  // Hide row and add form
  target.style.display = "none";
  target.parentNode.appendChild(clone);
  nowHidden = target;
}

var deleteTemplate = function(event) {
  event.preventDefault();
  // Remove from storage, then templates obj
  var formData = new FormData(event.target.parentNode);
  let rowNum = formData.get("rowNum");
  let templateId = templates[rowNum].templateId;

  browser.storage.local.remove(templateId).then(() => {
    console.log(`Template deleted id: ${templateId}`);
    templates.splice(rowNum, 1);
  });
};

// Set up mutation observer since node's event can only be accessed long after append/replace child
var container = document.querySelector(".container");
var mutationObserver = new MutationObserver((mutationsList) => {
  for (let mutation of mutationsList) {
    for (let node of mutation.addedNodes) {
      if (node.className && node.className.startsWith("row")) {
        // Open form
        let showFormButton = node.querySelector("a,#showForm");
        showFormButton && showFormButton.addEventListener("click", showForm);
        // Delete
        let deleteButton = node.querySelector("#delete")
        deleteButton && deleteButton.addEventListener("click", deleteTemplate);
        // Submit template
        let addButton = node.querySelector("#add");
        addButton && addButton.addEventListener("click", saveOptions);
      }
    }
  }
});
mutationObserver.observe(container, { childList: true, subtree: true });

var lastId = -1;

// Add
var addRow = function(template) {
  templates.push(templates[templates.length - 1]);
  templates[templates.length - 2] = template;
}

var saveOptions = function(event) {
  event.preventDefault();
  var formData = new FormData(event.target.parentNode.parentNode);
  let rowNum = formData.get("rowNum");
  formData.delete("rowNum");

  // Map FormData to option entry
  var optionMapped = {};
  for (const entry of formData) {
    optionMapped[entry[0]] = entry[1];
  }

  // Check if new
  let isNew = false;
  if (parseInt(optionMapped.templateId) === -1) {
    optionMapped.templateId = ++lastId + "";
    isNew = true;
  }

  // Now put it on the real option
  let option = {};
  option[optionMapped.templateId] = JSON.stringify(optionMapped);
  console.log(`Saving ${isNew ? "new" : "existing"} template id: ${optionMapped.templateId} name: ${optionMapped.templateName}`);

  browser.storage.local.set(option).then(() => {
    // Reset currently hidden row
    nowHidden = null;
    if (isNew) {
      addRow(optionMapped);
    } else {
      templates[rowNum] = optionMapped;
    }
  });
}

var restoreOptions = function() {
  browser.storage.local.get().then((results) => {
    // Fix for FF < 52
    if (results.length > 0) {
      results = results[0];
    }

    for (const key in results) {
      if (key !== "useLightIcon") {
        let obj = JSON.parse(results[key]);
        templates.push({ templateId: obj.templateId, templateName: obj.templateName, templateBody: obj.templateBody });
        lastId = lastId < obj.templateId ? obj.templateId : lastId;
      }
    }
  }, (error) => {
    console.log(`Error: ${error}`);
  }).then(() => {
    templates.push({ templateId: -1, templateName: "" });
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);

// ----------------- Internationalization ------------------
for (let node of document.querySelectorAll('[data-i18n],template')) {
  if (node.content) {
    for (let nodeInside of node.content.querySelectorAll("[data-i18n]")) {
      let [text, attr] = nodeInside.dataset.i18n.split('|');
      text = chrome.i18n.getMessage(text);
      attr ? nodeInside[attr] = text : nodeInside.appendChild(document.createTextNode(text));
    }
  } else {
    let [text, attr] = node.dataset.i18n.split('|');
    text = chrome.i18n.getMessage(text);
    attr ? node[attr] = text : node.appendChild(document.createTextNode(text));
  }
}
// ----------------- /Internationalization -----------------
