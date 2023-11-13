# DTA Data File Codec

Codec for reading Stata .DTA files and generating CSF workbook objects
compatible with the [SheetJS](https://sheetjs.com) library constellation.

DTA datasets can support millions of observations and over 32767 variables.
The codec will truncate data to 1048576 observations and 16384 variables.

<https://docs.sheetjs.com/docs/constellation/dta> includes a live demo.