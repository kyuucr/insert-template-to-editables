// Create root context menu item
browser.contextMenus.create({
    id: "root",
    title: browser.i18n.getMessage("contextItemTitle"),
    icons: {
        16: "icons/insert-dark.svg",
        32: "icons/insert-dark.svg"
    },
    contexts: ["editable"]
});

// Context menu item for empty menu
var nullWindowItem = {
    id: "null-window",
    title: browser.i18n.getMessage("contextItemTitleNull"),
    contexts: ["editable"],
    parentId: "root",
    enabled: false,
};

browser.contextMenus.create(nullWindowItem);

// Generate context menu item from a window
var generateItem = function (id, name) {
    let item = {
        id: "child-" + id,
        title: name,
        contexts: ["editable"],
        parentId: "root"
    };
    return item;
};

var setActionIcon = function (useLightIcon) {
    if (useLightIcon === "on") {
        browser.browserAction.setIcon(
        {
            path: {
                16: "icons/insert-light.svg",
                32: "icons/insert-light.svg"
            }
        });
    } else {
        browser.browserAction.setIcon({
            path: {
                16: "icons/insert-dark.svg",
                32: "icons/insert-dark.svg"
            }
        });
    }
}

browser.contextMenus.onClicked.addListener((info, tab) => {
    let message = templates[info.menuItemId.split(/-(.+)/)[1]].templateBody;
    console.log(`Inserting template: "${message}" to tab id: ${tab.id}`);
    browser.tabs.executeScript({
        file: "content-script.js"
    }).then(() => {
        browser.tabs.sendMessage(tab.id, message);
    });
});

// Submenu handling
var numOfSubmenu = 0;

var addSubmenuAction = function(template) {
    if (!templates[template.templateId]) {
        console.log(`Add submenu for template id: ${template.templateId} name: ${template.templateName}`);
        if (numOfSubmenu === 0) {
            browser.contextMenus.remove("null-window");
        }
        browser.contextMenus.create(generateItem(template.templateId, template.templateName));
        ++numOfSubmenu;
    } else {
        console.log(`Updating submenu for template id: ${template.templateId} name: ${template.templateName}`);
        browser.contextMenus.update("child-" + template.templateId, { title: template.templateName });
    }
};

var deleteSubmenuAction = function(templateId) {
    if (templates[templateId]) {
        console.log(`Deleting submenu for template id: ${templateId} name: ${templates[templateId].templateName}`);
        browser.contextMenus.remove("child-" + templateId);
        --numOfSubmenu;
        if (numOfSubmenu === 0) {
            browser.contextMenus.create(nullWindowItem);
        }
    }
};

// Templates proxy
var templates = new Proxy({}, {
    set: function(target, prop, value) {
        addSubmenuAction(value);
        return Reflect.set(...arguments);
    },
    get: function(target, prop, value) {    // Having this removes warning
        return Reflect.get(...arguments);
    },
    deleteProperty: function(target, prop) {
        deleteSubmenuAction(prop);
        return Reflect.deleteProperty(...arguments);
    }
});

browser.storage.local.get().then(results => {
    // Fix for FF < 52
    if (results.length > 0) {
        results = results[0];
    }
    for (const key in results) {
        if (key === "useLightIcon") {
            setActionIcon(results[key]);
        } else {
            let obj = JSON.parse(results[key]);
            templates[obj.templateId] = { templateId: obj.templateId, templateName: obj.templateName, templateBody: obj.templateBody };
        }
    }
});

browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
        for (let key in changes) {
            if (key === "useLightIcon") {
                setActionIcon(changes[key].newValue);
            } else {
                if (changes[key].newValue === undefined) {
                    let obj = JSON.parse(changes[key].oldValue);
                    delete templates[obj.templateId];
                } else {
                    let obj = JSON.parse(changes[key].newValue);
                    templates[obj.templateId] = obj;
                }
            }
        }
    }
});

browser.runtime.onMessage.addListener((message) => {
    if (message.error) {
        switch(message.error) {
            case "element-not-recognized":
                browser.notifications.create("add-link-to-qbt-notif", {
                    type: "basic",
                    iconUrl: browser.extension.getURL("icons/insert-dark.svg"),
                    title: browser.i18n.getMessage("notificationTitle"),
                    message: browser.i18n.getMessage("errorElemUnaccessible")
                });
        }
    }
});
