/**
 * Reactant v0.1.1 - Created by Katrina Scialdone
 * 
 * Heavily based on Github's Catalyst framework, and designed to be a hyper-lightweight, pure-JS 
 *  alternative to Catalyst's core functionality.
 * https://github.github.io/catalyst
 */
export const version = "0.1.1"

/** 
 * Define and register a custom element.
 * @param {{new(): HTMLElement}} elementClass The class to define as a custom element
 * @param {string} tagName The tag name for the custom element (defaults to generating from the class name)
 * @param {string} templateName The name attribute of the desired template element (defaults to the custom element's tag name)
 * @param {boolean} useShadowRoot If `true`, puts the template in the element's shadow DOM instead of as direct children (default: `true`)
 * @param {string[]} attrs A list of property names to link as attributes
 * @param {string[]} targets A list of property names to link as targets
 */
export default function reactant(elementClass, { tagName, templateName, useShadowRoot = true, attrs = [], targets = [] } = {}) {
  // Wrap the element's connectedCallback to perform needed initialization
  const connect = elementClass.prototype.connectedCallback
  elementClass.prototype.connectedCallback = function() {
    // Attach the appropriate template if it exists
    // Uses shadow root by default, unless the useShadowRoot option is true
    let templateElement = document.querySelector(`template[name="${templateName ?? this.constructor.tagName}"]`)
    if(templateElement) {
      if(useShadowRoot) {
        this.attachShadow({ mode: 'open' })
            .append(templateElement.content.cloneNode(true))
      } else {
        this.append(templateElement.content.cloneNode(true))
      }
    }
  
    // Bind attrs and update to initial values in DOM
    for(let attr of attrs) {
      let descriptor = getAttrDescriptor(this, attr), value
      value = attr in this ? this[attr] : ''

      Object.defineProperty(this, attr, descriptor)
      if(!this.hasAttribute(getAttrName(attr))) descriptor.set.call(this, value)
      else this[attr] = descriptor.get.call(this)
    }

    // Link targets
    for(let target of targets) {
      let discover = this[target] instanceof Array ? findTargets : findTarget
      Object.defineProperty(this, target, {
        configurable: true,
        get() { return discover(this, target) }
      })
    }

    // Call through to the element's defined connectedCallback
    connect?.call(this)

    // Set up actions
    const observer = new MutationObserver(mutations => {
      for(let mutation of mutations) {
        if(mutation.type === 'attributes' && mutation.target instanceof Element) {
          bindActions(mutation.target)
        }
        if(mutation.type === 'childList' && mutation.addedNodes.length) {
          for(let node of mutation.addedNodes)
            if(node instanceof Element) bindActionsDeep(node)
        }
      }
    })
    this.unwatchActions = () => observer.disconnect()

    observer.observe(this, { childList: true, subtree: true, attributeFilter: ['data-action'] })
    if(this.shadowRoot)
      observer.observe(this.shadowRoot, { childList: true, subtree: true, attributeFilter: ['data-action'] })

    bindActionsDeep(this)
    bindActionsDeep(this.shadowRoot)
  }

  // Add all defined attrs to observedAttributes
  elementClass.observedAttributes = 
    attrs.map(getAttrName).concat(elementClass.observedAttributes ?? [])

  // Save the tag name to the class, and define it as a custom element type
  elementClass.tagName = tagName ?? elementClass.name
    .replace(/([A-Z]($|[a-z]))/g, '-$1')
    .replace(/(^-|-Element$)/g, '')
    .toLowerCase()
  window.customElements
    .define(elementClass.tagName, elementClass)
}

/**
 * Convert a JS property name to a DOM attribute name.
 * @param {string} name The property name
 * @returns The attribute name
 */
function getAttrName(name) {
  return `data-${name.replace(/([A-Z]($|[a-z]))/g, '-$1')}`.replace(/--/g, '-').toLowerCase()
}

/**
 * Get a property descriptor to replace a given property which links its state to a DOM attribute. Supports numbers, booleans, and strings.
 * @param {HTMLElement} instance The element instance to pull from
 * @param {string} name The property name
 * @returns The DOM-linked property descriptor
 */
function getAttrDescriptor(instance, name) {
  const attrName = getAttrName(name)

  switch(typeof instance[name]) {
    case 'number':
      return {
        get() { return Number(this.getAttribute(attrName) ?? 0) },
        set(newValue) { return this.setAttribute(attrName, Number(newValue)) }
      }
    case 'boolean':
      return {
        get() { return this.hasAttribute(attrName) },
        set(newValue) { return this.toggleAttribute(attrName, !!newValue) }
      }
    default:
      return {
        get() { return this.getAttribute(attrName) ?? '' },
        set(newValue) { return this.setAttribute(attrName, newValue ?? '') }
      }
  }
}

/**
 * Bind all actions on the given element or its children.
 * @param {Element | ShadowRoot} root The root element to bind
 */
function bindActionsDeep(root) {
  if(!root) return
  for(let el of root.querySelectorAll('[data-action]')) bindActions(el)
  if(root instanceof Element && root.dataset.action) bindActions(root)
}

/**
 * Bind all actions on the given element
 * @param {Element} el The element
 */
function bindActions(el) {
  el.__reactantActionAborter?.abort()
  if(!el.dataset.action) return
  el.__reactantActionAborter = new AbortController()

  let actions = (el.dataset.action ?? '').trim().split(/\s+/)
  for(let action of actions) {
    let actionObj = {
      event: action.split(':')[0],
      target: action.split(':')[1].split('#')[0],
      method: action.split('#')[1]
    }
    el.addEventListener(actionObj.event, handleAction(actionObj), { 
      signal: el.__reactantActionAborter.signal 
    })
  }
}

/**
 * Get an event handler for the given action definition
 * @param {{ event: string, target: string, method: string }} action The parsed action definition
 * @returns An event handler that will pass the element along to the linked method
 */
function handleAction(action) { return function(event) {
  let target = event.target.closest(action.target)
  if(target) return target[action.method]?.(event)

  target = event.target.getRootNode()?.host
  if(target && target.matches(action.target))
    return target[action.method]?.(event)
}}

/**
 * Search an element's children for one with a `data-target` attribute matching the element and a given name
 * @param {HTMLElement} element The root element to begin searching from
 * @param {string} name The target property name
 * @returns The found target element
 */
function findTarget(element, name) {
  let tag = element.constructor.tagName
  if(element.shadowRoot) {
    for(let child of element.shadowRoot.querySelectorAll(`[data-target~="${tag}.${name}"]`))
      if(!child.closest(tag)) return child
  }
  for(let child of element.querySelectorAll(`[data-target~="${tag}.${name}"]`))
    if(child.closest(tag) === element) return child
}

/**
 * Search an element's children for any with a `data-target` attribute matching the element and a given name
 * @param {HTMLElement} element The root element to begin searching from
 * @param {string} name The target property name
 * @returns All found target elements
 */
function findTargets(element, name) {
  let tag = element.constructor.tagName
  let targets = []
  if(element.shadowRoot) {
    for(let child of element.shadowRoot.querySelectorAll(`[data-target~="${tag}.${name}"]`))
      if(!child.closest(tag)) targets.push(child)
  }
  for(let child of element.querySelectorAll(`[data-target~="${tag}.${name}"]`))
    if(child.closest(tag) === element) targets.push(child)
  return targets
}
