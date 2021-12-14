# aremel

[![CodeQL](https://github.com/fcapolini/aremel/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/fcapolini/aremel/actions/workflows/codeql-analysis.yml)
[![Node.js CI](https://github.com/fcapolini/aremel/actions/workflows/node.js.yml/badge.svg)](https://github.com/fcapolini/aremel/actions/workflows/node.js.yml)

Aremel is a groundbreaking [Node.js](https://nodejs.dev)/[Express](http://expressjs.com) web framework that adds *reactivity*, *modularity* and *isomorphism* to plain HTML.

👉  Aremel is in active development and will be published via npm when a first release is ready.

## Concepts

* Aremel is a modern *reactive framework* like React. But rather than turning JavaScript into a page descriptor, it turns HTML into a reactive language.
* You can add logic to HTML tags by using *logic attributes*, prefixed
with `:`. They don't appear in the output HTML and are compiled to
JavaScript code behind the scenes.
* Anywhere in your markup you can insert *JavaScript expressions* surrounded by the `[[` and `]]` markers. They are replaced by their value in the output HTML.
* You can define your own reusable components using the `<:define>` tag. Combined with `<:import>` it also lets you very easily define reusable component libraries.
* Reactivity is completely transparent, in a design reminiscent of the venerable [OpenLaszlo](https://en.wikipedia.org/wiki/OpenLaszlo) framework: no need to call `render()` or anything to keep your page up to date.
* Aremel's server is also its compiler: you only need to set the server up and it transparently compiles your code for both the client and the server as needed to serve your pages.
* Finally, Aremel supports [Server Side Rendering](https://www.digitalocean.com/community/tutorials/react-server-side-rendering) out of the box, automatically implementing an [isomprphic](https://medium.com/@ElyseKoGo/an-introduction-to-isomorphic-web-application-architecture-a8c81c42f59) behaviour with zero effort on your part.

What follows is a comparison of two of [React's homepage examples](https://reactjs.org/) in Aremel and React's [JSX](https://reactjs.org/docs/introducing-jsx.html).

## Aremel vs JSX: A Simple Component

### Aremel:

```html
<!DOCTYPE html>
<html>
  <body>
    <:define tag="hello-message" :name="">
      Hello [[name]]
    </:define>

    <hello-nessage :name="Taylor"/>
  </body>
</html>
```

* `<:define>` declares a component named `hello-message`, implemented by default as a `<div>`, which expects a `:name` attribute
* `<hello-message>` uses the component with a specific `:name`

### JSX:

```jsx
class HelloMessage extends React.Component {
  render() {
    return (
      <div>
        Hello {this.props.name}
      </div>
    );
  }
}

ReactDOM.render(
  <HelloMessage name="Taylor" />,
  document.getElementById('hello-example')
);
```

* React makes a distinction between stateless and stateful components, whereas in Aremel all components are stateful in React terms. Components whose data don't change can be considered akin to React's stateless components.
* The Aremel version of this example is a complete page which can be directly used in its server, which automatically compiles and delivers it to the client.
* In contrast, you need a development environment to compile the JSX example plus a companion HTML page to load your logic before you can consider serving it to a browser.

## Aremel vs JSX: A Stateful Component

### Aremel:

```html
<!DOCTYPE html>
<html>
  <body>
    <:define tag="seconds-counter"
             :count=[[0]]
             :on-count=[[setTimeout(() => count++, 1000)]]>
      Seconds: [[count]]
    </:define>

    <seconds-counter/>
  </body>
</html>
```

* `<:define>` declares a `seconds-counter` component with a `:count` value and an `:on-count` handler which gets executed each time the value changes.
* `<seconds-counter>` creates an instance of the component.
* Server-side, `:count` is set to zero at delivery time and `:on-count` is executed, but it uses `setTimeout()` which does nothing since anything in the future is left to the client.
* The output page content-ready and contains  `Seconds: 0`. This way static clients like web crawlers get a fully indexable page, while web browser get a client-side web app with its initial state already expressed in an immediately displayable page.
* Client-side, Aremel runtime is asynchronously loaded and the same process takes place, but this time `setTimeout()` is real, so after one second `:count` gets incremented (and automatically reflected in the DOM thanks to reactivity). This in turn executes `:on-count` and so on.

### JSX:

```jsx
class Timer extends React.Component {
  constructor(props) {
    super(props);
    this.state = { seconds: 0 };
  }

  tick() {
    this.setState(state => ({
      seconds: state.seconds + 1
    }));
  }

  componentDidMount() {
    this.interval = setInterval(() => this.tick(), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    return (
      <div>
        Seconds: {this.state.seconds}
      </div>
    );
  }
}

ReactDOM.render(
  <Timer />,
  document.getElementById('timer-example')
);
```

* This example implements what's known as a stateful component in React, which in Aremel is just a normal component like in the previous example.
* The difference in size and, more importantly, in readability is now much greater.
* In general the more real-world your code gets, the greater the difference in complexity between Aremel and JSX code.

## A Few Important Details

* Aremel uses a preprocessor to implement modularization with `<:import>` and componentization with `<:define>`. Aremel components are conceptually similar to C macros.
* The preprocessor supports multiline attributes with unescaped `<` and `>` characters in their content so tag attributes can be comfortably used to contain sizeable blocks of code. Of course, output HTML is always standars compliant.
* The construct `attribute=[[<code>]]` is syntactic sugar for `attribute="[[<code>]]"` where you don't need to escape attribute's quotes in your code.
* Any tag can be self closed and it's turned into an open/close tag combination if needed in the output HTML. E.g. `<div/>` becomes `<div></div>`, while `<meta/>` and  `<meta>` both become `<meta />`. You can just self close tags with no content as you would in XML.
* Aremel validates JavaScript, and extracts dependencies in order to implement reactivity, using [Babel](https://babeljs.io).
* Subjects we haven't touched upon here include Aremel's support for data binding, replication, JSON/XML data and services.

