var callback = function(templateMessage) {
    console.log("Inserting template: " + templateMessage);
    let activeElem = document.activeElement;

    // Element handling
    switch (activeElem.tagName.toLocaleLowerCase()) {
        case "textarea":
        case "input":
            // For input & textarea, use selection
            if (activeElem.selectionStart >= 0) {
                let startPos = activeElem.selectionStart;
                let endPos = activeElem.selectionEnd;
                activeElem.value = activeElem.value.substring(0, startPos)
                    + templateMessage
                    + activeElem.value.substring(endPos, activeElem.value.length);
                let actualLength = activeElem.tagName.toLocaleLowerCase() === "input" ? templateMessage.replace(/\n/g, "").length : templateMessage.length;
                activeElem.selectionStart = activeElem.selectionEnd = startPos + actualLength;
            }
            break;
        case "div":
            // For editables div, use DOM manipulation
            // Create nodes to be inserted
            let splitMessage = templateMessage.split(/\n/);
            let insertNodes = [];
            for (let i = 0; i < splitMessage.length; i++) {
                if (splitMessage[i]) {
                    insertNodes.push(document.createTextNode(splitMessage[i]));
                }
                if (i !== splitMessage.length - 1) {
                    insertNodes.push(document.createElement("br"));
                }
            }

            // Set range of nodes to be deleted
            let selectionRange = window.getSelection().getRangeAt(0);
            let startOffset = selectionRange.startOffset;
            let endOffset = selectionRange.endOffset;
            let parentNode, startDelete, endDelete;
            if (selectionRange.startContainer.childNodes.length > 0) {
                parentNode = selectionRange.startContainer;
                startDelete = selectionRange.startContainer.childNodes[startOffset];
                startOffset = -1; // Mark delete whole node
            } else {
                parentNode = selectionRange.startContainer.parentNode;
                startDelete = selectionRange.startContainer;
            }
            if (selectionRange.endContainer.childNodes.length > 0) {
                endDelete = selectionRange.endContainer.childNodes[endOffset];
                endOffset = -1; // Mark delete whole node
            } else {
                endDelete = selectionRange.endContainer;
            }

            // Get nodes to be deleted
            let deleteNodes = [];
            let deleteMode = false;
            for (let i = 0; i < parentNode.childNodes.length; i++) {
                if (parentNode.childNodes[i] === startDelete) {
                    deleteMode = true;
                }
                if (deleteMode) {
                    deleteNodes.push(parentNode.childNodes[i]);
                }
                if (deleteMode && parentNode.childNodes[i] === endDelete) {
                    break;
                }
            }

            // Start deleting
            let insertAnchor = null;
            if (deleteNodes.length > 1) {
                for (let i = 0; i < deleteNodes.length; i++) {
                    if (i === 0) {
                        if (startOffset > 0) {
                            let prefixSplit = deleteNodes[i].textContent.substring(0, startOffset);
                            parentNode.replaceChild(document.createTextNode(prefixSplit), deleteNodes[i]);
                        } else {
                            parentNode.removeChild(deleteNodes[i]);
                        }
                    } else if (i === deleteNodes.length - 1) {
                        if (endOffset > 0) {
                            let suffixSplit = deleteNodes[i].textContent.substring(endOffset, deleteNodes[i].textContent.length);
                            insertAnchor = document.createTextNode(suffixSplit);
                            parentNode.replaceChild(insertAnchor, deleteNodes[i]);
                        } else {
                            insertAnchor = deleteNodes[i].nextSibling;
                            parentNode.removeChild(deleteNodes[i]);
                        }
                    } else {
                        parentNode.removeChild(deleteNodes[i]);
                    }
                }
            } else if (deleteNodes.length === 1) {
                if (startOffset !== -1) {
                    let prefixSplit = deleteNodes[0].textContent.substring(0, startOffset);
                    let suffixSplit = deleteNodes[0].textContent.substring(endOffset, deleteNodes[0].textContent.length);
                    parentNode.insertBefore(document.createTextNode(prefixSplit), deleteNodes[0]);
                    insertAnchor = parentNode.insertBefore(document.createTextNode(suffixSplit), deleteNodes[0]);
                    parentNode.removeChild(deleteNodes[0]);
                } else {
                    insertAnchor = deleteNodes[0];
                }
            }

            // Begin insertion
            for (let i = 0; i < insertNodes.length; i++) {
                parentNode.insertBefore(insertNodes[i], insertAnchor);
            }
            break;
        default:
            browser.runtime.sendMessage({error: "element-not-recognized"});
    }

    // Promptly remove listener since this script is a run-once
    browser.runtime.onMessage.removeListener(callback);
};
browser.runtime.onMessage.addListener(callback);