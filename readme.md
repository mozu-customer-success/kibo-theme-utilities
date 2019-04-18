some common utilities and patterns for kibo-ng themes

## goals

- create a reusable/composable component library
- improve the build theme tools including continuous integration
- bridge the gap between components / arc applications (unified actions ideally with the arc actions being included here in a monorepo format)
- create/improve adapters to hide some of the boilerplate code for interfacing with backbone/core-theme
- it would be nice to be able to override the typical dropzone/widget config to allow server side rendering instead of maintaining seperate templates
- create a standardized interface for actions and props (every component should accept style, actions, requestHandler ...etc these patterns can be abstracted once established)
- integrate the plain text testing definition approach
- time travel debugging (drop in state / save serialized actions)
