gpx-smoother
============

The GPX Smoother lets you apply a few different "smoothing" algorithms to a GPX file for riding the route on a trainer.  The smoother is written in html, javascript, and css and does not require a server to run.

I love riding GPS routes on my Tacx trainer, but I wasn't happy with the built-in functionality for changing the elevation profile of a ride. The built-in smoothing is very slow and still leaves a lot of spikes in elevation. It is next to impossible to remove steep down-hill grades that I don't want as part of my indoor training. This program was created so that I can ride interesting routes, and set the slope where I want it.

Smooth - uses a simple box-score smoothing to smooth the elevation over a given number of points.
Set Range - lets you set the maximum and minimum slope (this what I usually use)
Flatten - lets you set the maximum change in slope between any two points.

The original and resulting elevation and slope are plotted using D3.js.  The route can be zoomed to select only a portion of the ride to smooth.

Elevation can be added from the Google Maps Elevation Service.  This is useful for routes that are created with programs that do not include elevation data.

The program is running here:
http://www.potter.ca/biking/smoother/gpxsmoother.html
