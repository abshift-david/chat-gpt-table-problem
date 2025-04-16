// Core extension functionality
const WebEnhancer = {
  // Constants
  STORAGE_KEY: "enhancer_data",

  // Available tools in the extension
  tools: {
    css_fixer: {
      id: "css_fixer",
      name: "CSS Table Fixer",
      description: "Fixes table layout issues by updating class attributes",
      icon: "table_icon.svg",
      run: function (tabId) {
        return chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: this.execute,
        });
      },
      execute: function () {
        // The new class to apply to the elements
        const newClass =
          "pointer-events-none flex justify-center *:pointer-events-auto";

        // Find elements with w-[100cqw] class
        const elements = Array.from(
          document.querySelectorAll("div[class]")
        ).filter((el) => {
          return (
            el.classList.contains("w-[100cqw]") ||
            el.className.includes("w-[100cqw]")
          );
        });

        // Store original classes for potential restoration
        const originalClasses = {};
        elements.forEach((el, index) => {
          originalClasses[`el-${index}`] = el.className;
        });

        // Save to storage if anything was found
        if (elements.length > 0) {
          const toolData = {
            timestamp: Date.now(),
            originalClasses: originalClasses,
          };

          // Try to save to storage
          try {
            // Send message to background script to save data
            chrome.runtime.sendMessage({
              action: "saveToolData",
              toolId: "css_fixer",
              data: toolData,
            });
          } catch (error) {
            console.warn("Unable to save original classes:", error);
          }
        }

        // Apply the new class to each element
        elements.forEach((el) => {
          el.className = newClass;
        });

        // Return the count of modified elements for feedback
        return {
          success: true,
          count: elements.length,
          message:
            elements.length > 0
              ? `Fixed ${elements.length} table element${
                  elements.length !== 1 ? "s" : ""
                }!`
              : "No matching elements found on this page.",
        };
      },
      undo: function (tabId) {
        return chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: this.executeUndo,
        });
      },
      executeUndo: function () {
        // The new class that was applied
        const newClass =
          "pointer-events-none flex justify-center *:pointer-events-auto";
        let restoredCount = 0;

        // Return a promise that will be resolved when we get the data
        return new Promise((resolve) => {
          // Request original classes from background
          chrome.runtime.sendMessage(
            {
              action: "getToolData",
              toolId: "css_fixer",
            },
            (response) => {
              if (
                !response ||
                !response.data ||
                !response.data.originalClasses
              ) {
                resolve({
                  success: true,
                  count: 0,
                  message: "No elements to restore.",
                });
                return;
              }

              const originalClasses = response.data.originalClasses;

              // Find elements to restore
              const selector = `div.${newClass.split(" ").join(".")}`;
              const elements = document.querySelectorAll(selector);

              // Restore original classes
              Object.values(originalClasses).forEach((className, index) => {
                if (elements[index]) {
                  elements[index].className = className;
                  restoredCount++;
                }
              });

              // Clear stored data if we restored anything
              if (restoredCount > 0) {
                chrome.runtime.sendMessage({
                  action: "clearToolData",
                  toolId: "css_fixer",
                });
              }

              resolve({
                success: true,
                count: restoredCount,
                message:
                  restoredCount > 0
                    ? `Restored ${restoredCount} element${
                        restoredCount !== 1 ? "s" : ""
                      }!`
                    : "No elements to restore.",
              });
            }
          );
        });
      },
    },

    // Template for adding future tools - you can add more tools here
    /* 
      dark_mode: {
        id: 'dark_mode',
        name: 'Dark Mode Enforcer',
        description: 'Forces dark mode on any website',
        icon: 'dark_mode_icon.svg',
        run: function(tabId) {
          return chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: this.execute
          });
        },
        execute: function() {
          // Implementation goes here
          document.body.style.backgroundColor = '#121212';
          document.body.style.color = '#e0e0e0';
          
          // Find all elements with white background
          const elements = document.querySelectorAll('*');
          const originalStyles = {};
          
          elements.forEach((el, index) => {
            const style = window.getComputedStyle(el);
            const bgColor = style.backgroundColor;
            const textColor = style.color;
            
            // Store original styles
            originalStyles[`el-${index}`] = {
              backgroundColor: el.style.backgroundColor,
              color: el.style.color
            };
            
            // Only change if element has light background
            if (bgColor === 'rgb(255, 255, 255)' || bgColor === 'rgba(255, 255, 255, 1)') {
              el.style.backgroundColor = '#1e1e1e';
            }
            
            // Only change if element has dark text
            if (textColor === 'rgb(0, 0, 0)' || textColor === 'rgba(0, 0, 0, 1)') {
              el.style.color = '#e0e0e0';
            }
          });
          
          // Save original styles for potential restoration
          try {
            chrome.runtime.sendMessage({
              action: 'saveToolData',
              toolId: 'dark_mode',
              data: {
                timestamp: Date.now(),
                originalStyles: originalStyles
              }
            });
          } catch (error) {
            console.warn('Unable to save original styles:', error);
          }
          
          return {
            success: true,
            count: elements.length,
            message: 'Dark mode applied!'
          };
        },
        undo: function(tabId) {
          return chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: this.executeUndo
          });
        },
        executeUndo: function() {
          // Implementation similar to css_fixer's undo
        }
      },
      
      ad_remover: {
        id: 'ad_remover',
        name: 'Ad Element Remover',
        description: 'Hides common ad elements on web pages',
        icon: 'ad_blocker_icon.svg',
        run: function(tabId) {
          return chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: this.execute
          });
        },
        execute: function() {
          // Common ad selectors
          const adSelectors = [
            '[id*="ad-"]', '[class*="ad-"]', '[id*="ads-"]', '[class*="ads-"]',
            '[id*="banner"]', '[class*="banner"]',
            'iframe[src*="ad"]', 'iframe[src*="ads"]',
            '[id*="sponsor"]', '[class*="sponsor"]',
            '[id*="promo"]', '[class*="promo"]',
            '[data-ad]', '[data-ads]',
            '[id*="google_ads"]', '[class*="google_ads"]'
          ];
          
          // Find all potential ad elements
          const adElements = document.querySelectorAll(adSelectors.join(','));
          const hiddenElements = {};
          let count = 0;
          
          // Hide ad elements and store original display values
          adElements.forEach((el, index) => {
            if (el.offsetHeight > 0 || el.offsetWidth > 0) { // Only target visible elements
              hiddenElements[`el-${index}`] = {
                element: el,
                display: el.style.display,
                visibility: el.style.visibility
              };
              
              el.style.display = 'none';
              el.style.visibility = 'hidden';
              count++;
            }
          });
          
          // Save for potential restoration
          try {
            chrome.runtime.sendMessage({
              action: 'saveToolData',
              toolId: 'ad_remover',
              data: {
                timestamp: Date.now(),
                hiddenElements: hiddenElements
              }
            });
          } catch (error) {
            console.warn('Unable to save hidden elements data:', error);
          }
          
          return {
            success: true,
            count: count,
            message: count > 0 ? 
              `Removed ${count} ad element${count !== 1 ? 's' : ''}!` : 
              'No ad elements found on this page.'
          };
        }
      },
      
      readability: {
        id: 'readability',
        name: 'Reading Mode',
        description: 'Simplifies page layout for better reading experience',
        icon: 'reading_icon.svg',
        run: function(tabId) {
          return chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: this.execute
          });
        },
        execute: function() {
          // Store original page state
          const originalState = {
            bodyStyle: {
              margin: document.body.style.margin,
              maxWidth: document.body.style.maxWidth,
              padding: document.body.style.padding,
              backgroundColor: document.body.style.backgroundColor,
              color: document.body.style.color,
              fontSize: document.body.style.fontSize,
              lineHeight: document.body.style.lineHeight
            },
            hiddenElements: []
          };
          
          // Hide distracting elements
          const distractingSelectors = [
            'header', 'footer', 'aside', 'nav',
            '.sidebar', '.nav', '.menu', '.comments', 
            '.social', '.share', '.related', 
            'iframe', 'ins', '[role="banner"]',
            '[role="complementary"]', '.advertisement'
          ];
          
          document.querySelectorAll(distractingSelectors.join(',')).forEach((el, index) => {
            originalState.hiddenElements.push({
              index: index,
              display: el.style.display,
              visibility: el.style.visibility
            });
            
            el.style.display = 'none';
            el.style.visibility = 'hidden';
          });
          
          // Find main content
          let mainContent = document.querySelector('article') || 
                            document.querySelector('main') || 
                            document.querySelector('#content') ||
                            document.querySelector('.content') ||
                            document.querySelector('.post') ||
                            document.querySelector('.article');
                            
          if (!mainContent) {
            // If no obvious content container, find the element with most text
            let maxTextLength = 0;
            let bestElement = null;
            
            document.querySelectorAll('div, section').forEach(el => {
              const textLength = el.innerText.length;
              if (textLength > maxTextLength) {
                maxTextLength = textLength;
                bestElement = el;
              }
            });
            
            mainContent = bestElement || document.body;
          }
          
          // Style the page for better reading
          document.body.style.margin = '0';
          document.body.style.padding = '0';
          document.body.style.backgroundColor = '#f8f8f8';
          document.body.style.color = '#333';
          
          const contentWrapper = document.createElement('div');
          contentWrapper.id = 'web-enhancer-reader-mode';
          contentWrapper.style.maxWidth = '680px';
          contentWrapper.style.margin = '40px auto';
          contentWrapper.style.padding = '20px';
          contentWrapper.style.backgroundColor = '#fff';
          contentWrapper.style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)';
          contentWrapper.style.fontSize = '18px';
          contentWrapper.style.lineHeight = '1.6';
          
          // Clone the content to avoid modifying the original
          contentWrapper.innerHTML = mainContent.innerHTML;
          
          // Clear the body and add our wrapper
          document.body.innerHTML = '';
          document.body.appendChild(contentWrapper);
          
          // Save original state
          try {
            chrome.runtime.sendMessage({
              action: 'saveToolData',
              toolId: 'readability',
              data: {
                timestamp: Date.now(),
                originalState: JSON.stringify(originalState),
                originalHTML: document.documentElement.outerHTML
              }
            });
          } catch (error) {
            console.warn('Unable to save original page state:', error);
          }
          
          return {
            success: true,
            count: 1,
            message: 'Reading mode enabled!'
          };
        }
      }
      */
  },

  // Get all available tools
  getTools: function () {
    return Object.values(this.tools);
  },

  // Get a specific tool by ID
  getTool: function (toolId) {
    return this.tools[toolId];
  },
};

// Make WebEnhancer available globally
window.WebEnhancer = WebEnhancer;
