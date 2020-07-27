const readline = require('readline');

//===============================================================================================
// Classes
//===============================================================================================

/** Class for a node */
class Node {
	constructor( data = null ) {
		this.next = new Map()
		this.data = data
		this.isLast = {
			lastField: false,
			pattern: null
		}
	}

	/**
    * Set Last parameter to true for pattern
    * @param {string} pattern - Incoming pattern ex. "a,*,c"
  */
	setLast ( pattern ) {
		this.isLast = {
			lastField: true,
			pattern: pattern
		}
	}
}

/** Class for a Trie of patterns */
class PatternTrie {
	constructor ( tieBreaker = false ) {
		this.root = new Node()
		this.tieBreaker = tieBreaker
	}

	/**
    * Adds a pattern into the Trie
    * @param {string} input - Pattern to be added ex. "foo,*,*"
  */
	addPattern ( input ) {

		const tokenized = input.split(',')

		/**
	    * Func that can be called recursively to spread input fields into PatternTrie
	    * @param {object} node - Current node in search
	    * @param {object[]} fieldList - List of fields
	  */
		function findInjectionPoint ( node, fieldList ) {

			// Stop running and set isLast once we have stored all the fields
			if ( fieldList.length === 0 ) {
				node.setLast(input)
				return
			}

			//see if current node has children that match the field we're looking at. ex "A" or "*" or "foo"
			if ( !node.next.has( fieldList[0] ) ) {
				// Set field as next property on node
				node.next.set(fieldList[0], new Node( fieldList[0] ))
				//remove the el that was just added
				let storedField = fieldList.shift()
				//recursively call func
				return findInjectionPoint( node.next.get( storedField ), fieldList )
			} 
			else {
				let storedField = fieldList.shift()
				return findInjectionPoint( node.next.get( storedField ), fieldList )
			}
		}

		// Call func with initial passed in data
		findInjectionPoint( this.root, tokenized )
	}

	/**
    * Finds all possible matches of patterns within the Trie for the passed in path
    * NOTE: If tieBreaker is set to true during creation this function will ignore when it finds both a matching field AND an asterisk.
    *				In this case, it will only proceed through the Trie following the exact field match. This feature is to accommodate for best match criteria of 
    *       "prefer the pattern whose leftmost wildcard appears in a field further to the right" and can be used to find optimal patterns when
    *				multiple pattern matches have returned from initial Trie search
    * @param {string} path - Path to find matching patterns
  */
	findMatches ( path ) {

		// - Ignore all leading and trailing "/" and then split string into array
		let sanitizedPath = path.replace( /^[\/]+|[\/]+$/g, "").split("/")
		let foundPaths = []

		// Using arrow func to inherit "this" in order to access root node from PatternTrie 
		const isPathAvailable = ( input, node = this.root, wildCardAmount = 0 ) => {

			// Search has finished
			if( input.length === 0 ) {

				//If the current node is not last, this is only a partial pattern match. aka No match
				if( !node.isLast.lastField ) {
					return false 
				}
				else {
					// If the foundPaths array is empty, push this match
					if( foundPaths.length === 0 ) {
						foundPaths.push({
							path: node.isLast.pattern,
							wildCardAmount
						})
						return true
					}
					// If the foundPaths array already has at least 1 item in it
					else {
						// only add to foundPaths list if the new match has less than or equal to the amount of asterisks contained in at least 1 stored match
						if ( foundPaths.some( match => wildCardAmount <= match.wildCardAmount) ) {
							//Remove all matches that contain more asteriks than the new addition
							foundPaths = foundPaths.filter( match => match.wildCardAmount <= wildCardAmount)
							foundPaths.push({
								path: node.isLast.pattern,
								wildCardAmount
							})
						}

						return 
					}
				}
			}

			let doesNextNodeContainField = node.next.has( input[0] )
			let doesNextNodeContainWildcard = node.next.has( "*" )

			//-------------------------------------------------------
			// Found both field and asterisk match 
			//-------------------------------------------------------
			if( doesNextNodeContainField && doesNextNodeContainWildcard && !this.tieBreaker ) {

				// Create a stack and execute in order of importance
				const pathStack = []
			
				pathStack.push( {
					node: node.next.get( input[0] ),
					fieldSlice: input.slice(1)
				})
				pathStack.push( {
					node: node.next.get("*"),
					fieldSlice: input.slice(1)
				})

				while ( pathStack.length > 0 ) {
					//pull first path off stack (first options will always be a non wildcard)
					let possiblePath = pathStack.shift()
					if( possiblePath.node.data === "*") {
						wildCardAmount += 1
					}
					isPathAvailable(possiblePath.fieldSlice, possiblePath.node, wildCardAmount )

				}

			}

			//-------------------------------------------------------
			// FIELD MATCH ONLY
			//-------------------------------------------------------
			else if ( doesNextNodeContainField ) {
				//Recursively call isPathAvailable with the next node and next slice of field 
				return isPathAvailable(input.slice(1), node.next.get(input[0]), wildCardAmount)
			}
			//-------------------------------------------------------
			// ASTERIK MATCH ONLY
			//-------------------------------------------------------
			else if ( doesNextNodeContainWildcard ) {
				// Increment wildcard counter
				wildCardAmount +=1

				//Recursively call isPathAvailable with the next node and next slice of field 
				return isPathAvailable(input.slice(1), node.next.get("*"), wildCardAmount )
			}
			else {
				return false 
			}
			
		}

		// Start recursive func by calling it with entire field list and root node
		isPathAvailable(sanitizedPath)

		if( foundPaths.length === 0 ) {
			return "NO MATCH"
		}
		else if ( foundPaths.length === 1 ) {
			return foundPaths[0].path
		}
		// If a tie was found when searching for best path, build new Trie with known matches and follow logic to find most optimal path
		else {
			// Passing in true to set the tieBreaker so the search func will ignore when a node contains both an exact field match and an asterisk as children 
			let tieWinnerTrie = new PatternTrie(true)

			for ( let i = 0; i < foundPaths.length; i++ ) {
				tieWinnerTrie.addPattern(foundPaths[i].path )
			}
			//Most optimal path
			let tieWinner = tieWinnerTrie.findMatches(path)

			return tieWinner
		}

	}
}

//===============================================================================================
// Funcs
//===============================================================================================

/**
  * Reads incoming data from stdin and then sorts paths/patterns
*/
async function readStdinSync() {

	const patterns = [];
	const paths = [];
	let lineCounter = 0;
	let patternCount;

	const rl = readline.createInterface({
	  input: process.stdin,
	  output: process.stdout,
	  terminal: false
	});

	// Sort each incoming line into pattern or path
	// Once all incoming data is sorted, resolve promise and return sorted data
  return new Promise( resolve => {
  	rl.on('line', seperatePatternsAndPaths)
  	.on('close', () => {
      resolve( [ patterns, paths ] )
    })
  })

  function seperatePatternsAndPaths ( line ) {

		// Set amount of incoming patterns
		if( lineCounter === 0 ) {
			patternCount = Number(line)
	    lineCounter++
			return
		}
		// Set amount of incoming paths 
		if( lineCounter - 1 === patternCount ) {
	    lineCounter++
	    return
		}

		// Store incoming patterns
		if( lineCounter <= patternCount ) {
	    patterns.push( line.trim() )
		}

		// Store incoming paths
		if( lineCounter > patternCount) {
	    paths.push( line.trim() )
		}

	  lineCounter++
	}
}

/**
  * Creates a Trie of patterns and then searches looking for the best match to each path
  * @param {object[]} patterns - A list of patterns ex. ['*,b,*','a,*,*','*,*,c','foo,bar,baz','w,x,*,*','t,r,e,w','w,*,y,z' ]
  * @param {object[]} paths - A list of paths ex. [ '/w/x/y/z/', 'a/b/c', 'foo/', 'foo/bar/', 'foo/bar/baz/' ]
*/
function getBestMatches ( patterns, paths ) {

	// Init PatternTrie instance
	let patternTrie = new PatternTrie()

	//populate PatternTrie
	for ( let i = 0; i < patterns.length; i++ ) {
		patternTrie.addPattern(patterns[i] )
	}

	// For each path, find and print best matching pattern
	// We could print them here, but in order to easily be able to test this func, I have it returning the data and printing to the console in the main() func
	return paths.map( function ( path ) {
		return { path, best: patternTrie.findMatches(path) }
	})
 
}

/**
  * Main program func and init point
*/
async function main() {
  const [ patterns, paths ] = await readStdinSync()
  let matches = getBestMatches( patterns, paths )
  matches.forEach( ( match ) => {
  	// Using console.log instead of process.stdout.write as it already includes formating with line breaks at the end 
  	console.log(match.best)
  });
  process.exit(0)
}

//===============================================================================================
// Execute
//===============================================================================================
main()


// Exports for testing
module.exports = {
	getBestMatches
}