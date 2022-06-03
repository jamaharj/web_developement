
'use strict';

/* 
 * ==============================================
 *            UNPARSED DATA RETRIEVAL
 *                
 * ==============================================
*/

/**
 * Make query to the https://www.coingecko.com 
 * to get bitcoin data in JSON form.
 * @returns data
 */ 
const getData = async (APIJSONquery) => {
  try {
    const response = await fetch(APIJSONquery);
    const data = await response.json();
    return data;
  } catch (err){
    console.log(err)
  }
}

/* 
 * ==============================================
 *            DATA PARSING FUNCTIONS
 *              
 * ==============================================
*/

/**
 * Function resolves the longest constant days that market price of the day N is lower than the day N-1
 * @param {*} daysPrices parsed data of the days price's at UTC time 00:00
 * @returns longest continous downward days streak in market
 */
function longestDownwardDays(daysPrices) {

  let mostDownwardDays = 0;
  let downwardDays = 0;
  
  for(let i = 1; i<daysPrices.prices.length; i++) {
    
    if(daysPrices.prices[i][1] < daysPrices.prices[i-1][1]){
      downwardDays = downwardDays+1;
      if(downwardDays > mostDownwardDays){
        mostDownwardDays = downwardDays;
      }
    }else{
      downwardDays = 0;
    }
  }
  console.log(mostDownwardDays);
  return mostDownwardDays;   
}

/**
 * Function parses day's prices from data. Day's price is price as close as
 * possible to the midnight UTC time 00:00
 * @param {*} data unparsed bitcoin data from coingecko
 * @returns list of parsed data of day's prices at UTC time 00:00
 */
function parseDaysPriceFromData(data)  {

  let listOfDaysPrices = {
    "prices": [],
    "total_volumes": []
  };

  // set startingdays clock to midnight
  let startday = new Date(data.prices[0][0]);
  startday.setUTCHours(24);  startday.setUTCMinutes(0);  startday.setUTCSeconds(0);
  
  let i = 0;
  while ( i< data.prices.length) {

    if (new Date(data.prices[i][0]) >= new Date(startday.getTime())) {

      // define which point from data is closer to UTC time 00:00 
      let timeBfrMidnight = startday.getTime() - data.prices[i-1][0];
      let timeAfterMidinight = data.prices[i][0] - startday.getTime();
 
      if (timeAfterMidinight < timeBfrMidnight ) {
        listOfDaysPrices.prices.push(data.prices[i]);
        listOfDaysPrices.total_volumes.push(data.total_volumes[i]);
      }       
      else{
        listOfDaysPrices.prices.push(data.prices[i-1]);
        listOfDaysPrices.total_volumes.push(data.total_volumes[i-1]);
      }
      // next day
      startday = addDays(startday, 1);
    }
    i++;    
  }

  console.log(listOfDaysPrices);
  return listOfDaysPrices;
}

/**
 * Function searches the date and volume of the day's with the highest trading volume from given data range
 * @param {*} daysPrices parsed bitcoin data from coingecko in midnight UTC 00:00
 * @returns date and price in €'s with hiehest trading volume
 */
function parseHighestTradingVolume(daysPrices) {

  let highestTradingVolume = new Array(daysPrices.total_volumes[0][0], daysPrices.total_volumes[0][1]);
  let i = 1;

  while (i<daysPrices.total_volumes.length) {

    if (daysPrices.total_volumes[i][1] > highestTradingVolume[1]) {
      highestTradingVolume[0] = daysPrices.total_volumes[i][0];
      highestTradingVolume[1] = daysPrices.total_volumes[i][1];
    }
    i++;
  }

  return highestTradingVolume;
}

/**
 * Function calculates the best buiyng date and best selling date indexes.
 * Dates are determined so that buyer has the best chance to buy and sell to get profit as much as possible
 * so best day to buy is not always the date with lowest price if trading volume is low.
 * @param {*} daysPrices given dates prices and trading volumes
 * @returns bestDays[index of best day to buy, index of best day to sell]
 */
function bestDayToSellAndBuy(daysPrices) {
  
  // bestDays[index of best day to buy, index of best day to sell]
  let bestDays = new Array(0,-1);
  let profit = 0;
  let minimunPriceIndex = 0;

  // calculate best profit between buy and sell dates and define them
  let i = 0; // i = index of possible buy date
  while(i < daysPrices.prices.length) {

    // check the minimum price between given date interval 
    if (daysPrices.prices[i][1] < daysPrices.prices[minimunPriceIndex][1]) {
      minimunPriceIndex = i;      
    }

    let j = i + 1; // j = index of possible sell date

    // calculate the best daysProfit between possible buy date (i) and sell dates (j - daysPrices.lenght)
    while( j < daysPrices.prices.length) {

      let daysProfit = 0;

      if(daysPrices.prices[j][0] > daysPrices.prices[i][0]) {
        
        /**
         * buy date buying volume lesser than selling date trading volume
         * you can make only profit maximum amount of selling dates trading volume
         * (bitcoin bought (day i) / bitcoin bought /(day j) * (days price (day j) - days price (day 1))
         * ex. (10 coins / 20 coins), but 10 coins maximum can be bought so probabilty to get profit is 50 % (10 coins / 20 coins) * (20 euro - 10 euro) = probability to make 5 euro profit
         */
        if(daysPrices.total_volumes[i][1] / daysPrices.total_volumes[j][1] < 1) {
          daysProfit = (daysPrices.total_volumes[i][1] / daysPrices.total_volumes[j][1]) * (daysPrices.prices[j][1] - daysPrices.prices[i][1]);
          if(daysProfit > profit) {
            profit = daysProfit;
            bestDays[0] = i;
            bestDays[1] = j;
          }
        }
        /**
         * every coin can be possible to sell while buiyng date volume higher than selling date volume
         * ex. (20 coins / 10 coins), but 10 coins maximum can be sold so probabilty to get profit is 100 % => (20 euro - 10 euro) = probability to make 10 euro profit
         */
        else {
          daysProfit =  daysPrices.prices[j][1] - daysPrices.prices[i][1];
          if(daysProfit > profit) {
            profit = daysProfit;
            bestDays[0] = i;
            bestDays[1] = j;
          }
        }
      }
      j++;
    }
    i++;
  }

  // In case day's price is only decreasing the best day to buy is day with the lowest day's price
  if (bestDays[1] == -1) {
    bestDays[0] = minimunPriceIndex;
  }

  return bestDays;
}


/* 
 * ==============================================
 *            TIME FUNCTIONS 
 *              
 * ==============================================
*/

/**
 * Function adds days to given date
 * @param {*} date the given date
 * @param {*} days to add
 * @returns date + days
 */
 function addDays(date, days) {
  const copy = new Date(Number(date))
  copy.setDate(date.getDate() + days)
  return copy
}

/**
 * Function adds hours to given date
 * @param {*} date given date
 * @param {*} hours to add
 * @returns date + hours
 */
function addHours(date, hours) {
  const copy = new Date(Number(date))
  copy.setHours(date.getHours() + hours)
  return copy
}

/**
 * Function removes hours from given date
 * @param {*} date given date
 * @param {*} hours to remove
 * @returns date + hours
 */
 function removeHours(date, hours) {
  const copy = new Date(Number(date))
  copy.setHours(date.getHours() - hours)
  return copy
}

/**
 * Function formats date in right UTC format
 * @param {*} date given date in ms
 * @returns date in string format "4.1.2021"
 */
 function formatDate(date) {

  let string =  new Date(date).getUTCDate() + "." + new Number(new Date(date).getUTCMonth() + 1)  + "." + new Date(date).getUTCFullYear();
  return string;
}

/* 
 * ==============================================
 *       USER INTERACTION EVENT HANDLERS
 *              
 * ==============================================
*/

/**
 * Event handler: for search button to get info of bitcoin data from coingecko and provides recommendation based on user input
 * Result: gives recommendation for user / error to change user input
 */
const getMostDownwardDays = async() => { // const getMostDownwardDays = async(days) => {
  
  let startday = new Date(document.getElementById("startday").value);
  let endday = new Date(document.getElementById("endday").value);
  const root = ReactDOM.createRoot(document.getElementById('recommendation'));


  try {
    if(startday.getTime() === endday.getTime()) {
      var element = /*#__PURE__*/React.createElement("div", null, 
      /*#__PURE__*/React.createElement("p", { className: "title" }, "Error:"),
      /*#__PURE__*/React.createElement("p", { className: "info" }, "Wrong search time input. Starting and ending date can't be same date.")
      );
      root.render(element);
    }
    else if(startday.getTime() > new Date() || endday.getTime() > new Date()){
      var element = /*#__PURE__*/React.createElement("div", null, 
      /*#__PURE__*/React.createElement("p", { className: "title" }, "Error:"),
      /*#__PURE__*/React.createElement("p", { className: "info" }, "Wrong search time input. Search starting date or ending date can't be later than "+ new Date())
      );
      root.render(element);
    }
    else if(startday.getTime() > endday.getTime() || isNaN(startday.getTime()) || isNaN(endday.getTime())){
      var element = /*#__PURE__*/React.createElement("div", null, 
      /*#__PURE__*/React.createElement("p", { className: "title" }, "Error:"),
      /*#__PURE__*/React.createElement("p", { className: "info" }, "Wrong search time input. Starting date is later than ending date.")
      );
      root.render(element);
    }
    else if(startday instanceof Date && endday instanceof Date){
      
      // add -1 hours to start date and +1 to hours to end date in order to get day's price on midnight
      startday = removeHours(startday, 1);
      endday = addHours(endday, 1);

      // parse and form https query by given days
      startday = "" + startday.getTime() + ""; startday = startday.substring(0, 10);
      endday = "" + endday.getTime() + ""; endday = endday.substring(0, 10);
      const APIJSONquery = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=eur&from='+startday+'&to='+endday+'';
      
      // get the data from coingecko
      let data = await getData(APIJSONquery);
      // parse day's prices from data
      let listOfDaysPrices = parseDaysPriceFromData(data);
      // searh the date with highest trading volume
      let highestTradingVolume = parseHighestTradingVolume(listOfDaysPrices);
      // count the longest constinous downwarddays
      let longestStreak = longestDownwardDays(listOfDaysPrices);
      // searches the best day to buy and sell bitcoins
      let bestDays =  bestDayToSellAndBuy(listOfDaysPrices);

      let tradingDaysInfo;
      if(bestDays[1] == -1) {
        tradingDaysInfo = /*#__PURE__*/ React.createElement("p", { className: "info" }, "Best day to buy ", formatDate(new Date(listOfDaysPrices.prices[bestDays[0]][0])) ," but you better to hold bitcoins for later to get profit.")
      }
      else {
        tradingDaysInfo = /*#__PURE__*/ React.createElement("p", { className: "info" }, "Best day to buy ", formatDate(new Date(listOfDaysPrices.prices[bestDays[0]][0])) ," and best day to sell ", formatDate(new Date(listOfDaysPrices.prices[bestDays[1]][0])), " bitcoins to get best profit.")
      }

      var element = /*#__PURE__*/React.createElement("div", null, 
      /*#__PURE__*/React.createElement("p", { className: "title" }, "Recommendation:"),
      /*#__PURE__*/React.createElement("p", { className: "info" }, "Longest bearish trend was ",longestStreak," days a row."), 
      /*#__PURE__*/React.createElement("p", { className: "info" }, "Highest trading volume was ", highestTradingVolume[1], " €'s on ", formatDate(highestTradingVolume[0]), "."), 
      /*#__PURE__*/ tradingDaysInfo
      );
      root.render(element);
      }
    else {
      var element = /*#__PURE__*/React.createElement("div", null, 
      /*#__PURE__*/React.createElement("p", { className: "title" }, "Error:"),
      /*#__PURE__*/React.createElement("p", { className: "info" }, "Wrong input format. Type the search time in format: DD-MM-YYYY.")
      );
      root.render(element);
    }    
  } catch (error) {
    var element = /*#__PURE__*/React.createElement("div", null, 
    /*#__PURE__*/React.createElement("p", { className: "title" }, "Error:"),
    /*#__PURE__*/React.createElement("p", { className: "info" }, "Something went wrong. Take contact to service provider.")
    );
    root.render(element);
  }
}