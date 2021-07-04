var DATA_SERVICE_URL = 'https://script.google.com/macros/s/AKfycbwDKcGJlAcl0ue46cqc6wEs1C0m5jp69ESl-jMkqzsz5MDq-WAxEK-eFuuNs2Iu61V0/exec?jsonp=?'
var DEFAULT_CENTER = {lat: 22.55, lng: 80.50};
var DEFAULT_ZOOM = 5;
var AUTO_ZOOM = 3;
var userZoom = DEFAULT_ZOOM;
var map;
var checkboxes = {};
var infoWindow;
var markerClicked = false;
var previousName;
var mapping_full_data = {};
var target_count = 0;
var covered_count = 0;
var wd_count = 0;

class AutocompleteDirectionsHandler {
  map;
  originPlaceId;
  destinationPlaceId;
  travelMode;
  directionsService;
  directionsRenderer;
  constructor(map) {
    this.map = map;
    this.originPlaceId = "";
    this.destinationPlaceId = "";
    this.travelMode = google.maps.TravelMode.WALKING;
    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({suppressMarkers: true});
    this.directionsRenderer.setMap(map);
    const originInput = document.getElementById("origin-input");
    const destinationInput = document.getElementById("destination-input");
    const modeSelector = document.getElementById("mode-selector");
    const originAutocomplete = new google.maps.places.Autocomplete(originInput);
    // Specify just the place data fields that you need.
    originAutocomplete.setFields(["place_id"]);
    const destinationAutocomplete = new google.maps.places.Autocomplete(
      destinationInput
    );
    // Specify just the place data fields that you need.
    destinationAutocomplete.setFields(["place_id"]);
    this.setupClickListener(
      "changemode-walking",
      google.maps.TravelMode.WALKING
    );
    this.setupClickListener(
      "changemode-transit",
      google.maps.TravelMode.TRANSIT
    );
    this.setupClickListener(
      "changemode-driving",
      google.maps.TravelMode.DRIVING
    );
    this.setupPlaceChangedListener(originAutocomplete, "ORIG");
    this.setupPlaceChangedListener(destinationAutocomplete, "DEST");
    this.map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(modeSelector);
    this.map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(
      destinationInput
    );
    this.map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(originInput);
  }
  // Sets a listener on a radio button to change the filter type on Places
  // Autocomplete.
  setupClickListener(id, mode) {
    const radioButton = document.getElementById(id);
    radioButton.addEventListener("click", () => {
      this.travelMode = mode;
      this.route();
    });
  }
  setupPlaceChangedListener(autocomplete, mode) {
    autocomplete.bindTo("bounds", this.map);
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();

      if (!place.place_id) {
        window.alert("Please select an option from the dropdown list.");
        return;
      }

      if (mode === "ORIG") {
        this.originPlaceId = place.place_id;
      } else {
        this.destinationPlaceId = place.place_id;
      }
      this.route();
    });
  }
  route() {
    if (!this.originPlaceId || !this.destinationPlaceId) {
      return;
    }
    const me = this;
    this.directionsService.route(
      {
        origin: { placeId: this.originPlaceId },
        destination: { placeId: this.destinationPlaceId },
        travelMode: this.travelMode,
      },
      (response, status) => {
        if (status === "OK") {
          me.directionsRenderer.setDirections(response);
        } else {
          window.alert("Directions request failed due to " + status);
        }
      }
    );
  }
}

function debounce(func, wait, immediate) {
  let timeout;
  return function() {
    let context = this,
      args = arguments;
    let later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    let callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

function initializeMap() {
  map = new google.maps.Map(document.getElementById("map-canvas"), {
    center: validateLatLng($.urlParam('lat'), $.urlParam('lng')), 
    zoom: validateZoom($.urlParam('zoom')),
    mapTypeControlOptions: {
      position: google.maps.ControlPosition.TOP_RIGHT
    }
  });
  new AutocompleteDirectionsHandler(map);
  infoWindow = new google.maps.InfoWindow({
    pixelOffset: new google.maps.Size(0, -10),
    disableAutoPan: true
  })
  setEventHandlers();
  map.data.setStyle(techCommItemStyle);
  var input = /** @type {HTMLInputElement} */(
    document.getElementById('place-search'));

  var types = document.getElementById('type-selector');
  var branding = document.getElementById('branding');
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(branding);
  map.controls[google.maps.ControlPosition.LEFT_TOP].push(types);
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  // Get the data from the tech comm spreadsheet, using jQuery's ajax helper.
  $.ajax({
    url: DATA_SERVICE_URL,
    dataType: 'jsonp',
    success: function(data) {
      // Get the spreadsheet rows one by one.
      // First row contains headings, so start the index at 1 not 0.
      covered_count = 0;
      target_count = 0;
      wd_count = 0;
      for (var i = 2; i < data.length; i++) {
        map.data.add({
          name: data[i][2],
          type: "establishment",
          properties: {
            title : data[i][2],
            final_coverage_plan: data[i][0],
            base_goi_mkt_id: data[i][1],
            bas_goi_mkt_name: data[i][2],
            new_district_name: data[i][3],
            population: data[i][4],
            pop_group: data[i][5],
	    mas_score: data[i][6],
            district: data[i][7],
            nearest_market: data[i][10],
            distance_from_nearest_market: data[i][11],
            new_mapping_wd_code: data[i][12],
            wd_name: data[i][15],
            wd_town: data[i][16]
          },
          geometry: {
            lat: data[i][8], 
            lng: data[i][9]
          }
        });
        map.data.add({
         properties: {
            title : data[i][15],
            final_coverage_plan: "WD",
            district: data[i][7],
            new_mapping_wd_code: data[i][12],
            wd_name: data[i][15],
            wd_town: data[i][16]
          },
         geometry: {
            lat: data[i][17],
            lng: data[i][18]
          }
        });
        if(data[i][0] == "Covered")
          covered_count++;
        if(data[i][0] == "Target")
          target_count++;
        wd_count++;
      }
      mapping_full_data = data;
      var legend = document.getElementById("legend");
      legend.innerHTML = "<h3>Count</h3>";
      var div1 = document.createElement("div");
      div1.innerHTML = ' <p> Target - '+target_count+'</p>';
      legend.appendChild(div1);
      var div2 = document.createElement("div");
      div2.innerHTML = '<p> Covered - '+covered_count+'</p>';
      console.log("Covered - ", covered_count);
      legend.append(div2);
      var div3 = document.createElement("div");
      div3.innerHTML = '<p> WDs - '+wd_count+'</p>';
      legend.append(div3);
      map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legend);
      createCheckbox();
    }
  });
  let inputContainer = document.querySelector('autocomplete-input-container');
  let autocomplete_results = document.querySelector('.autocomplete-results');
  let service = new google.maps.places.AutocompleteService();
  let serviceDetails = new google.maps.places.PlacesService(map);
  let marker = new google.maps.Marker({
    map: map
  });
  let displaySuggestions = function(predictions, status) {
    if (status != google.maps.places.PlacesServiceStatus.OK) {
      alert(status);
      return;
    }
    var size_pre = 0;
    if(prediction_map.length> 3)
    {
        size_pre = 3;
    }
    else
    {
        size_pre = prediction_map.length;
    }
    let results_html = [];	
    for (var i = 0; i<size_pre; i++)
    {
        predictions.unshift(prediction_map[i]);
    }
    predictions.forEach(function(prediction) {
      results_html.push(`<li class="autocomplete-item" data-type="place" data-place-id=${prediction.place_id}><span class="autocomplete-icon icon-localities"></span><span class="autocomplete-text">${prediction.description}</span></li>`);
    });
    autocomplete_results.innerHTML = results_html.join("");
    autocomplete_results.style.display = 'block';
    let autocomplete_items = autocomplete_results.querySelectorAll('.autocomplete-item');
    for (let autocomplete_item of autocomplete_items) {
      autocomplete_item.addEventListener('click', function() {
        let prediction = {};
        const selected_text = this.querySelector('.autocomplete-text').textContent;
        const place_id = this.getAttribute('data-place-id');
        let request = {
          placeId: place_id,
          fields: ['name', 'geometry']
        };

        serviceDetails.getDetails(request, function(place, status) {
          if (status == google.maps.places.PlacesServiceStatus.OK) {
            if (!place.geometry) {
              return;
            }
            var bounds = new google.maps.LatLngBounds();
            marker.setPosition(place.geometry.location);
            if (place.geometry.viewport) {
              bounds.union(place.geometry.viewport);
            } else {
              bounds.extend(place.geometry.location);
            }
            map.fitBounds(bounds);
          }
          else
          {
            var res = request.placeId.split("_");
            var index = Number(res[0]);
            var type = res[1];
            if (type == "CovTar")
                var location = new google.maps.LatLng(mapping_full_data[index][8], mapping_full_data[index][9]);
            else
                var location = new google.maps.LatLng(mapping_full_data[index][17], mapping_full_data[index][18]);
            map.setZoom(16);
            map.panTo(location);
          }
          autocomplete_input.value = selected_text;
          autocomplete_results.style.display = 'none';
        });
      })
    }
  };
  
  var prediction_map = new Array();
  let autocomplete_input = document.getElementById('my-input-autocomplete');
  autocomplete_input.addEventListener('input', debounce(function() {
    let value = this.value;
    prediction_map = [];
    value.replace('"', '\\"').replace(/^\s+|\s+$/g, '');
    if (value !== "") {
        for (var i = 2; i<mapping_full_data.length; i++)
        {
            if (mapping_full_data[i][2].toUpperCase().startsWith(value.toUpperCase())) {
                var geojson = {"description": mapping_full_data[i][2], "place_id": i.toString()+"_CovTar"};
                prediction_map.push(geojson);
            }
            if(mapping_full_data[i][15].toUpperCase().startsWith(value.toUpperCase())) {
                var geojson = {"description": mapping_full_data[i][15], "place_id": i.toString()+"_WD"};
                prediction_map.push(geojson);
            }
        }
    
      service.getPlacePredictions({
        input: value
      }, displaySuggestions);
    } else {
      autocomplete_results.innerHTML = '';
      autocomplete_results.style.display = 'none';
    }
  }, 150));

}

document.addEventListener("DOMContentLoaded", function(event) {
  initializeMap();
});


function createCheckbox()
{
var set_wd = new Set();
for (var i = 2; i<mapping_full_data.length; i++)
{
    set_wd.add(mapping_full_data[i][16]);
}
var set_wd_arr = Array.from(set_wd);
set_wd_arr.sort();
set_wd_arr.unshift('Select All');
let div = document.getElementById('type-selector');
set_wd_arr.forEach(v => {
var checkbox = document.createElement('input');
checkbox.type = "checkbox";
checkbox.name = "type";
checkbox.checked = true;
checkbox.id = "selecttype-"+v;
checkbox.addEventListener("click", function() {
    handleCheckBoxClick(this, v, set_wd_arr);
});

var label = document.createElement('label');
label.htmlFor = "id";
label.appendChild(document.createTextNode(v));

div.append(checkbox);
div.append(label);
linebreak = document.createElement("br");
div.appendChild(linebreak);
});
}
function techCommItemStyle(feature) {
  var type = feature.getProperty('final_coverage_plan');

  var wd_town = feature.getProperty('wd_town');
  var style = {
    title : feature.getProperty('title'),
    // Show the markers for this type if
    // the user has selected the corresponding checkbox.
    scaledSize: new google.maps.Size(50, 50),
    visible: (checkboxes[wd_town] != false)
  };

  // Set the marker colour based on type of tech comm item.
  switch (type) {
    case 'Covered':
      style.icon = {url: 'green-marker.png',
      size: new google.maps.Size(71, 71),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(17, 34),
      scaledSize: new google.maps.Size(35, 35)};
  
      break;
    case 'Target':
      style.icon = {url: 'red-marker.png',
      size: new google.maps.Size(71, 71),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(17, 34),
      scaledSize: new google.maps.Size(35, 35)};
    
      break;
    case "WD":
      style.icon = {url: 'blue-marker.png',
      size: new google.maps.Size(71, 71),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(17, 34),
      scaledSize: new google.maps.Size(35, 35)};
    
    default:
      style.icon = {url: 'blue-marker.png',
      size: new google.maps.Size(71, 71),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(17, 34),
      scaledSize: new google.maps.Size(35, 35)};
  }
  return style;
}

function setEventHandlers() {
  // Show an info window when the user clicks an item.
  map.data.addListener('click', handleFeatureClick);

  // Show an info window when the mouse hovers over an item.
  map.data.addListener('mouseover', function(event) {
    createInfoWindow(event.feature);
    infoWindow.open(map);
 });

  // Close the info window when the mouse leaves an item.
  map.data.addListener('mouseout', function() {
    if (!markerClicked) {
      infoWindow.close();
    }
  });

  // Reset the click flag when the user closes the info window.
  infoWindow.addListener('closeclick', function() {
    markerClicked = false;
  });
}

// Create a popup window containing the tech comm info.
function createInfoWindow(feature) {
  infoWindow.setPosition(feature.getGeometry().get());
  infoWindow.setContent('No information found');

  var content = $('<div id="infowindow" class="infowindow">');
    
  if(feature.getProperty('final_coverage_plan')!="WD")
  {
  content.append($('<p>').text('Base GOI Market Name : '+feature.getProperty('bas_goi_mkt_name')));
  content.append($('<p>').text('Base GOI Market ID :'+feature.getProperty('base_goi_mkt_id')));
  content.append($('<p>').text('New District Name :'+feature.getProperty('new_district_name')));
  content.append($('<p>').text('Population:'+feature.getProperty('population')));
  content.append($('<p>').text('Pop Group :'+feature.getProperty('pop_group')));
  content.append($('<p>').text('MAS Score :'+feature.getProperty('mas_score')));
  content.append($('<p>').text('District :'+feature.getProperty('district')));
  content.append($('<p>').text('Nearest Market :'+feature.getProperty('nearest_market')));
  content.append($('<p>').text('Distance from neaarest market :'+feature.getProperty('distance_from_nearest_market')));
  content.append($('<p>').text('New Mapping WD Code :'+feature.getProperty('new_mapping_wd_code')));
  content.append($('<p>').text('Section Foods :'+feature.getProperty('section_foods')));
  content.append($('<p>').text('WD Name :'+feature.getProperty('wd_name')));
  content.append($('<p>').text('WD Town :'+feature.getProperty('wd_town')));
  }
  else
  {
  content.append($('<p>').text('District :'+feature.getProperty('district')));
  content.append($('<p>').text('New Mapping WD Code :'+feature.getProperty('new_mapping_wd_code')));
  content.append($('<p>').text('WD Name :'+feature.getProperty('wd_name')));
  content.append($('<p>').text('WD Town :'+feature.getProperty('wd_town')));
  }
    
  infoWindow.setContent(content.html());
  var position = feature.getGeometry().get().toJSON(); 
  $.extend(position, {zoom: AUTO_ZOOM});
}

// On click of marker, show the popup window and zoom in.
function handleFeatureClick(event) {
  // Check whether the marker has been clicked already,
  // because we want to zoom out on second click of same marker.
  var currentName = event.feature.getProperty('name');
  if (currentName == previousName) {
    // This is the second click, so zoom back to user's previous zoom level.
    map.setZoom(userZoom);
    // Reset flags ready for next time round.
    previousName = '';
    markerClicked = false;
  } else {
    previousName = event.feature.getProperty('name'); 
    // This is the first click, so show the popup window and zoom in.
    createInfoWindow(event.feature);

    // Zoom in before opening the info window.
    // If the user has already zoomed in beyond our automatic zoom,
    // leave their zoom setting untouched.
    if (map.getZoom() > AUTO_ZOOM) {
      userZoom = map.getZoom();
    } else {
      map.setZoom(AUTO_ZOOM);
      map.setCenter(event.feature.getGeometry().get());
      userZoom = DEFAULT_ZOOM;
    }

    // Open the info window and reset flag ready for next time round.
    infoWindow.open(map);
    markerClicked = true;
  }
}

// Respond to change in type selectors.
function handleCheckBoxClick(checkBox, type, set_wd_arr) {
  if (type == 'Select All')
  {
    set_wd_arr.forEach(v => {
    checkboxes[v] = checkBox.checked;
    document.getElementById('selecttype-'+v).checked = checkBox.checked;
    });
  }
  else
  {
  checkboxes[type] = checkBox.checked;
  }
  // Tell the Data Layer to recompute the style, since checkboxes have changed.
  map.data.setStyle(techCommItemStyle);
}

// Get values from a URL parameter specified by name.
$.urlParam = function(name) {
    var results = new RegExp('[\?&]' + name +
        '=([^&#]*)').exec(window.location.href);
    if (results == null) {
       return null;
    }
    else {
       return decodeURI(results[1]) || 0;
    }
}

// Validate the zoom value.
function validateZoom(zoom) {
  if ((zoom == null) || isNaN(zoom) || (+zoom < 0)) {
    return DEFAULT_ZOOM;
  }
  else {
    return +zoom;
  }
}

// Validate the latitude and longitude values.
function validateLatLng(lat, lng) {
  if ((lat == null) || isNaN(lat) || (+lat < -90) || (+lat > 90)) {
    return DEFAULT_CENTER;
  }

  if ((lng == null) || isNaN(lng) || (+lng < -180) || (+lng > 180)) {
    return DEFAULT_CENTER;
  }

  var center = {lat: +lat, lng: +lng};
  return center;
}
