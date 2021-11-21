Aremel stands for Reactive Markup Language. It adds reactivity, modularity and isomorphism to plain HTML.

```html
<html>
  <body :count=[[0]]
        :on-count=[[setTimeout(() => count++, 1000)]]>
    Seconds: [[count]]
  </body>
</html>
```

