# aremel

[![CodeQL](https://github.com/fcapolini/aremel/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/fcapolini/aremel/actions/workflows/codeql-analysis.yml)
[![Node.js CI](https://github.com/fcapolini/aremel/actions/workflows/node.js.yml/badge.svg)](https://github.com/fcapolini/aremel/actions/workflows/node.js.yml)

Aremel is a groundbreaking Node.js/Express web framework that adds *reactivity*, *modularity* and *isomorphism* to plain HTML.

## Concepts

* Aremel is a modern *reactive framework* like React. But rather than turning JavaScript into a page descriptor, it turns HTML into a reactive language (which I think makes a whole lot more sense TBH).
* You can add logic to HTML tags by using *logic attributes*, prefixed
with `:`. They don't appear in the output HTML and are turned into
JavaScript code behind the scenes.
* Anywhere in your markup you can insert *JavaScript expressions* surrounded by the `[[` and `]]` markers. They are replaced by their value in the output HTML.
* You can define your own reusable components using the `<:define>` tag. Combined with `<:import>` it also lets you define reusable component libraries with remarkable ease.
* Reactivity is completely transparent, in a design reminiscent of the venerable [OpenLaszlo](https://en.wikipedia.org/wiki/OpenLaszlo) framework: no need to call `render()` or anything to keep your page up to date.
* Aremel's server is also your compiler: you only need to set the server up and it transparently compiles your code for both the client and the server as needed to serve your pages.
* Finally, Aremel supports [Server Side Rendering](https://www.digitalocean.com/community/tutorials/react-server-side-rendering) out of the box, automatically implementing an [isomprphic](https://medium.com/@ElyseKoGo/an-introduction-to-isomorphic-web-application-architecture-a8c81c42f59) behaviour with zero effort on your side.

What follows is a comparison of two of [React's homepage examples](https://reactjs.org/) in Aremel and React's [JSX](https://reactjs.org/docs/introducing-jsx.html).

## Aremel vs JSX example: A Simple Component

### Aremel:

```html
<html>
  <body>
    <:define tag="hello-message" :name="">
      Hello [[name]]
    </:define>

    <hello-nessage :name="Taylor"/>
  </body>
</html>
```

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
* The Aremel version of this example is a complete page which can be used as is in its server, which automatically compiles and serves it.
* In contrast, you need a development environment to compile the JSX example plus a companion HTML page to load your logic before you can consider serving it to a browser.
* In spite of this the Aremel version is shorter and, in my opinion, much more readable.

## Aremel vs JSX example: A Stateful Component

### Aremel:

```html
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

* This example implements what's known as a stateful component in React, which is just a component like in the previous example in Aremel.
* The difference in size and, more importantly, in readability is now much greater.
* This is a trend: the more real-world your code gets, the greater the difference in complexity between Aremel and JSX code.

## A Few Important Details

* Aremel uses a preprocessor to implement modularization with `<:import>` and componentization with `<:define>`.
* The preprocessor supports multiline attributes with unescaped `<` and `>` characters in their content so tag attributes can be comfortably used to contain sizeable blocks of code. Output HTML is always standars compliant, of course.
* The construct `attribute=[[<code>]]` is syntax sugar for `attribute="[[<code>]]"` where you don't need to escape attribute's quotes in your code.
* One subject I haven't touched upon here is Aremel's support for data binding, replication and JSON/XML data.
