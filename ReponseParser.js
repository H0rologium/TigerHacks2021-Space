var w = prompt("What is your latitude? We promise not to track you.");
var x = prompt("What is your longitude? (I pinky promise, don't worry ;) )");
console.log("User Latitude:"+ w);
console.log("User Longitude:"+ x);
var latdistance1 = w * 111;
var logdistance1 = x * (Math.cos((w*Math.PI)/180)*111);

const satellites = [[36.04, -79.78], [92.57, -43.74]];

smallestDistance = 99999999999;
smallestIndex = 0;

function satBalls(satellites) {
	for(let i=0;i<satellites.length;i++) {
    var y = satellites[i][0];
    var z = satellites[i][1];

    console.log("Satellite Latitude:"+ y);
    console.log("Satellite Longitude:"+ z);

    var latdistance2 = y * 111
    var logdistance2 = z * (Math.cos((y*Math.PI)/180)*111)

    var a = Math.abs(latdistance1 - latdistance2)
    var b = Math.abs(logdistance1 - logdistance2)
    var c = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2))

    if(c <= 750){console.log("True");}
    else{console.log("False");}

    if(smallestDistance > c) {
      smallestDistance = c;
      smallestIndex = i;
    }
  }
}

satBalls(satellites);

console.log("The closest satellite is " + Math.round(smallestDistance) + " kilometers away.");
console.log("The satellite is above the coordinates: " + satellites[smallestIndex][0] + ", " + satellites[smallestIndex][1] + ".");