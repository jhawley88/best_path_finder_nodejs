var expect = require('chai').expect
const { getBestMatches } = require('../index');

describe('Optimal Path Test 1', function () {
	it('Find most optimal pattern to match to incoming paths', function () {

		let paths = [ '/w/x/y/z/', 'a/b/c', 'foo/', 'foo/bar/', 'foo/bar/baz/' ]
		let patterns = ['*,b,*','a,*,*','*,*,c','foo,bar,baz','w,x,*,*','t,r,e,w','w,*,y,z' ]

		let bestMatches = [
		  { path: '/w/x/y/z/', best: 'w,*,y,z' },
		  { path: 'a/b/c', best: 'a,*,*' },
		  { path: 'foo/', best: 'NO MATCH' },
		  { path: 'foo/bar/', best: 'NO MATCH' },
		  { path: 'foo/bar/baz/', best: 'foo,bar,baz' } 
		 ]

		 expect( getBestMatches(patterns,paths) ).to.eql( bestMatches );

	})
})

describe('Optimal Path Test 2', function () {
	it('Find most optimal pattern to match to incoming paths', function () {

		let paths = [
			"/Documents/Clients/JohnSmith/",
			"Documents/Clients/JillSmith/",
			"/foo/**/*",
			"foo/bar/",
			"other/**/bar/"
		]

		let patterns = [
			"Documents,*,JohnSmith",
			"*,Clients,JohnSmith",
			"*,*,JillSmith",
			"Documents,bar,baz",
			"*,**,bar",
			"foo,*,*" 
		]

		let bestMatches = [
		  { path: '/Documents/Clients/JohnSmith/', best: 'Documents,*,JohnSmith' },
		  { path: 'Documents/Clients/JillSmith/', best: '*,*,JillSmith' },
		  { path: '/foo/**/*', best: 'foo,*,*' },
		  { path: 'foo/bar/', best: 'NO MATCH' },
		  { path: 'other/**/bar/', best: '*,**,bar' }

		 ]

		 expect( getBestMatches(patterns,paths) ).to.eql( bestMatches );

	})
})

describe('Optimal Path Test 3', function () {
	it('Find most optimal pattern to match to incoming paths', function () {

		let paths = [
			"///Documents/Clients/JohnSmith///",
			"Documents/Clients/JillSmith",
			"/**/**/other",
			"foo/bar/",
			"other/**/bar/"
		]

		let patterns = [
			"Documents,Clients,*",
			"**,**,*",
			"*,*,JillSmith",
			"Documents,bar,baz",
			"*,bar",
			"foo,*,*" 
		]

		let bestMatches = [
		  { path: '///Documents/Clients/JohnSmith///', best: 'Documents,Clients,*' },
		  { path: 'Documents/Clients/JillSmith', best: 'Documents,Clients,*' },
		  { path: '/**/**/other', best: '**,**,*' },
		  { path: 'foo/bar/', best: '*,bar' },
		  { path: 'other/**/bar/', best: 'NO MATCH' }

		 ]

		 expect( getBestMatches(patterns,paths) ).to.eql( bestMatches );

	})
})