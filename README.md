# Reactant v0.1.0
*Created by Katrina Scialdone*

Reactant is a lightweight framework for creating web applications using the Web Components API. It is heavily inspired by Github's [Catalyst](https://github.github.io/catalyst) framework, and designed to be a hyper-lightweight, pure-JS alternative to Catalyst's core functionality. It weighs in at only 4.3kB minified (1.4kB gzipped), comes in a single `.js` file, and requires no preprocessors such as Typescript or Babel.

Since Reactant doesn't rely on Typescript decorators, the resulting API is slightly "uglier" than Catalyst, but doesn't require any pre-compilation or need heavy amounts of boilerplate to work around said pre-compilation. When the [TC39 decorators proposal](https://github.com/tc39/proposal-decorators) is implemented in modern browsers, this whole process will get a lot cleaner.

**Note: While you're welcome to use Reactant in your own projects, I don't recommend using it for large-scale or income-critical projects at this stage. I am a lone developer and created Reactant mostly for my own use, and I make no guarantees about regular maintenance or bulletproof code at this point in time. If you like the workflow you see here, I recommend checking out Catalyst instead.**

## Installation
You can include `reactant.min.js` in your project directly, or acquire it through a CDN like JSDelivr. Make sure you use `type="module"` to properly load it, or import it using the Javascript `import` declaration.
```html
<script type="module" src="https://cdn.jsdelivr.net/gh/KatrinaKitten/reactant@0.1.0/reactant.min.js"></script>
```

## Basic Custom Elements
Reactant relies on the browser's built-in Web Components API. This documentation will only cover the concepts and utilities implemented by Reactant itself. For more information on the basics of custom elements, such as lifecycle hooks and template slots, see the [MDN tutorial page](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements).

To define a custom element, call `reactant` on its class definition.
```js
reactant(class HelloWorldElement extends HTMLElement {})
```
```html
<hello-world></hello-world>
```

By default, the element's tag name will be based on the class name, removing the optional `Element` suffix and converting the rest of the name to `skewer-case`. You can override this by setting the `tagName` property on the options object.
```js
reactant(class HelloWorldElement extends HTMLElement {}, {
  tagName: "some-other-name"
})
```
```html
<some-other-name></some-other-name>
```

If there's a `<template>` element with a `name` attribute matching the tag name, its contents will be inserted into the element's shadow DOM. You can change the template name separately from the tag name using the `templateName` option, or have the template inserted as direct children of the element by setting the `useShadowRoot` option to `false`. Note that unlike Catalyst, these templates are expected to not be children of the custom element itself, but rather to be referenced from elsewhere, to help promote code reuse as much as possible; it's recommended to simply place them at the end of the `<body>` element.
```html
<template name="hello-world">
  <span>Hello, <slot>world</slot>!</span>
</template>
```

## Attrs
You can link class fields of the custom element to DOM attributes on its tag by listing their names in the `attrs` option. Attrs can be numbers, booleans, or strings; other values will be converted to strings by default, and the type of an attr's default value will be enforced for new values (defaulting to string if unset). Changing an attr field on the element object will update the DOM attribute accordingly, and vice versa. If the DOM attribute is defined manually on the tag, it will override the default value of the attr.
```js
reactant(class HelloWorldElement extends HTMLElement {
  greetingTarget = "world"
}, {
  attrs: ['greetingTarget']
})
```
```html
<!-- The data-greeting-target attribute is automatically added! -->
<hello-world data-greeting-target="world"></hello-world>

<!-- By defining it manually, you can override the value easily. -->
<hello-world data-greeting-target="Reactant"></hello-world>
```

## Actions
You can define actions on a custom element or any child using the `data-action` attribute. The syntax is `event:tag-name#methodName`. When the child receives the specified event, it will search up the DOM tree to find the closest parent matching the given tag (usually the custom  element itself), and call the given method on it, passing the event object. If the triggering child is inside of the shadow DOM, it can access the host element via actions, but can't go any higher up the DOM. Multiple actions can be defined on the same element, separated by spaces. If for some reason you need an element to ignore any changes to it and its childrens' actions, you can call `customElement.unwatchActions()`.
```js
reactant(class HelloWorldElement extends HTMLElement {
  buttonClick(event) {
    alert("Hello, world!")
  }
})
```
```html
<hello-world>
  <button data-action="click:hello-world#buttonClick">Say hello</button>
</hello-world>
```

## Targets
Instead of using `querySelector` to dig for child elements, you can mark fields with the `targets` option to automatically query children with a matching `data-target` attribute into  them when accessed, including from the shadow DOM. The syntax is `tag-name.fieldName`. Any property with its default value set to an array will return an array of matching children, otherwise it will return only the first matching child. Only children that are not inside another of the same tag will be found, so nesting works properly. Note that unlike Catalyst, there is no distinction between `target` and `targets`, and only the `data-target` attribute is used.
```js
reactant(class HelloWorldElement extends HTMLElement {
  targetChild
  targetChildren = []
}, {
  targets: ['targetChild', 'targetChildren']
})
```
```html
<hello-world>
  <span data-target="hello-world.targetChild">I'm a single target</span>
  <span data-target="hello-world.targetChildren">I'm a multiple target</span>
  <span data-target="hello-world.targetChildren">I'm a multiple target</span>
</hello-world>
```
