# aremel

[![CodeQL](https://github.com/fcapolini/aremel/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/fcapolini/aremel/actions/workflows/codeql-analysis.yml)
[![Node.js CI](https://github.com/fcapolini/aremel/actions/workflows/node.js.yml/badge.svg)](https://github.com/fcapolini/aremel/actions/workflows/node.js.yml)

Aremel adds reactivity, modularity and isomorphism to plain HTML.

```html
<html>
  <body :count=[[0]]
        :on-count=[[setTimeout(() => count++, 1000)]]>
    Seconds: [[count]]
  </body>
</html>
```
