Monogram
========

A very simple html5 attempt at picture messaging for little printer.
Uses file upload now that it works in Mobile Safari (it's always worked on Android  think)
It then draws the image to a canvas to resize it and filter it with various monochrome dithering algorithms.

Currently:
 1. Floyd-Steinberg dithering
 2. Thresholding
 3. Sobel edge detection blended with a threshold filter.
 4. Bayer dithering
