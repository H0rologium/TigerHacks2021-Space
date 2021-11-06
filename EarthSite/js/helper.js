/* =============================================== */
/* =============== CLOCK ========================= */
/* =============================================== */

/**
 * Factory function for keeping track of elapsed time and rates.
 */
export function clock() {
  var rate = 60; // 1ms elapsed : 60sec simulated
  var date = d3.now();
  var elapsed = 0;

  function clock() {}

  clock.date = function (timeInMs) {
    if (!arguments.length) return date + elapsed * rate;
    date = timeInMs;
    return clock;
  };

  clock.elapsed = function (ms) {
    if (!arguments.length) return date - d3.now(); // calculates elapsed
    elapsed = ms;
    return clock;
  };

  clock.rate = function (secondsPerMsElapsed) {
    if (!arguments.length) return rate;
    rate = secondsPerMsElapsed;
    return clock;
  };

  return clock;
}

/* ==================================================== */
/* =============== CONVERSION ========================= */
/* ==================================================== */

export function radiansToDegrees(radians) {
  return (radians * 180) / Math.PI;
}

export function satrecToFeature(satrec, date, props) {
  var properties = props || {};
  var positionAndVelocity = satellite.propagate(satrec, date);
  var gmst = satellite.gstime(date);
  var positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
  properties.height = positionGd.height;
  return {
    type: "Feature",
    properties: properties,
    geometry: {
      type: "Point",
      coordinates: [
        radiansToDegrees(positionGd.longitude),
        radiansToDegrees(positionGd.latitude),
      ],
    },
  };
}

export function satrecToXYZ(satrec, date) {
  var positionAndVelocity = satellite.propagate(satrec, date);
  var gmst = satellite.gstime(date);
  var positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
  return [positionGd.longitude, positionGd.latitude, positionGd.height];
}

/* ==================================================== */
/* =============== TLE ================================ */
/* ==================================================== */

/**
 * Factory function for working with TLE.
 */
export function tle(satellite) {
  var _properties;
  var _date;
  var _lines = function (arry) {
    return arry.slice(0, 2);
  };

  function tle() {}

  tle.satrecs = function (tles) {
    return tles.map(function (d) {
      return satellite.twoline2satrec.apply(null, _lines(d));
    });
  };

  tle.features = function (tles) {
    var date = _date || d3.now();

    return tles.map(function (d) {
      var satrec = satellite.twoline2satrec.apply(null, _lines(d));
      return satrecToFeature(satrec, date, _properties(d));
    });
  };

  tle.lines = function (func) {
    if (!arguments.length) return _lines;
    _lines = func;
    return tle;
  };

  tle.properties = function (func) {
    if (!arguments.length) return _properties;
    _properties = func;
    return tle;
  };

  tle.date = function (ms) {
    if (!arguments.length) return _date;
    _date = ms;
    return tle;
  };

  return tle;
}

/* ==================================================== */
/* =============== PARSE ============================== */
/* ==================================================== */

/**
 * Parses text file string of tle into groups.
 * @return {string[][]} Like [['tle line 1', 'tle line 2'], ...]
 */
export function parseTle(tleString) {
  // remove last newline so that we can properly split all the lines
  var lines = tleString.replace(/\r?\n$/g, "").split(/\r?\n/);

  return lines.reduce(function (acc, cur, index) {
    if (index % 2 === 0) acc.push([]);
    acc[acc.length - 1].push(cur);
    return acc;
  }, []);
}


 export function satelliteVector(satrec, date) {
    console.log('satrec and date below');
    console.log(satrec);
    console.log(date);
    var xyz = satrecToXYZ(satrec, date);
    var lambda = xyz[0];
    var phi = xyz[1];
    var cosPhi = Math.cos(phi);
    var r = ((xyz[2] + 6371) / 6371) * 228;
    return new THREE.Vector3(
      r * cosPhi * Math.cos(lambda),
      r * cosPhi * Math.sin(lambda),
      r * Math.sin(phi)
    );
 }
  
 export function vertex(point) {
   var lambda = (point[0] * Math.PI) / 180,
     phi = (point[1] * Math.PI) / 180,
     cosPhi = Math.cos(phi);
   return new THREE.Vector3(
     radius * cosPhi * Math.cos(lambda),
     radius * cosPhi * Math.sin(lambda),
     radius * Math.sin(phi)
   );
 }

 // See https://github.com/d3/d3-geo/issues/95
  export function graticule10() {
    var epsilon = 1e-6,
      x1 = 180,
      x0 = -x1,
      y1 = 80,
      y0 = -y1,
      dx = 10,
      dy = 10,
      X1 = 180,
      X0 = -X1,
      Y1 = 90,
      Y0 = -Y1,
      DX = 90,
      DY = 360,
      x = graticuleX(y0, y1, 2.5),
      y = graticuleY(x0, x1, 2.5),
      X = graticuleX(Y0, Y1, 2.5),
      Y = graticuleY(X0, X1, 2.5);

    function graticuleX(y0, y1, dy) {
      var y = d3.range(y0, y1 - epsilon, dy).concat(y1);
      return function (x) {
        return y.map(function (y) {
          return [x, y];
        });
      };
    }

    function graticuleY(x0, x1, dx) {
      var x = d3.range(x0, x1 - epsilon, dx).concat(x1);
      return function (y) {
        return x.map(function (x) {
          return [x, y];
        });
      };
    }

    return {
      type: "MultiLineString",
      coordinates: d3
        .range(Math.ceil(X0 / DX) * DX, X1, DX)
        .map(X)
        .concat(d3.range(Math.ceil(Y0 / DY) * DY, Y1, DY).map(Y))
        .concat(
          d3
            .range(Math.ceil(x0 / dx) * dx, x1, dx)
            .filter(function (x) {
              return Math.abs(x % DX) > epsilon;
            })
            .map(x)
        )
        .concat(
          d3
            .range(Math.ceil(y0 / dy) * dy, y1 + epsilon, dy)
            .filter(function (y) {
              return Math.abs(y % DY) > epsilon;
            })
            .map(y)
        ),
    };
  }