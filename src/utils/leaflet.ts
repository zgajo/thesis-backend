export const getMiddlePointForCurvedLine = (xLat: number, xLon: number, yLat:number, yLon: number)=>{
	let latlngs = [];

	let latlng1 = [xLat, xLon],
		latlng2 = [yLat, yLon];
	
	let offsetX = latlng2[1] - latlng1[1],
		offsetY = latlng2[0] - latlng1[0];
	
	let r = Math.sqrt( Math.pow(offsetX, 2) + Math.pow(offsetY, 2) ),
		theta = Math.atan2(offsetY, offsetX);
	
	let thetaOffset = (3.14/10);
	
	let r2 = (r/2)/(Math.cos(thetaOffset)),
		theta2 = theta + thetaOffset;
	
	let midpointX = (r2 * Math.cos(theta2)) + latlng1[1],
		midpointY = (r2 * Math.sin(theta2)) + latlng1[0];
	
	let midpointLatLng = [midpointY, midpointX];
	
	latlngs.push(latlng1, midpointLatLng, latlng2);

	return midpointLatLng
}

