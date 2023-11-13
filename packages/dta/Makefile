.PHONY: build
build: node browser

## NodeJS target

.PHONY: node
node: dist/dta.js

dist/dta.js: dta.ts
	npx esbuild@0.14.14 dta.ts --bundle --outdir=dist --platform=node

.PHONY: test-node
test-node: dist/dta.js test.js
	npx mocha@2.5.3 test.js

## Browser target
.PHONY: browser
browser: dist/dta.min.js

dist/dta.min.js: dta.ts
	npx esbuild@0.14.14 dta.ts --bundle --outfile=dist/dta.min.js --minify --sourcemap --global-name=DTA

