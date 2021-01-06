import {
  Card,
  Heading,
  Layout,
  Page,
  ResourceItem,
  ResourceList,
  TextField,
  Thumbnail,
  Toast,
  Frame,
  Banner,
  Stack,
  Button,
  Badge,
} from "@shopify/polaris";
import { useCallback, useEffect, useState } from "react";
import "./App.css";
import EmptyNominations from "./components/EmptyNominations";
import { cacheToLocalStorage, hydrateFromLocalStorage } from "./util";

// protect yo creds! - actually pointless since the key is appended to every request
const apiKey = process.env.REACT_APP_API_KEY; 
const apiURL = "https://www.omdbapi.com";

// TODO: Migrate to TypeScript so we can use an interface to constrain movies to a movie type

/**
 * Searches for movies on OMDB given query parameters
 * @param {string} query Search query
 * @param {number} [page] Page to return (defaults to 1)
 */
const searchMovies = async (query, page = 1) => {
  const searchMoviesURL = new URL(apiURL); // we make this a URL object to easily append query params onto it
  searchMoviesURL.searchParams.append("apikey", apiKey); // append the API key to authenticate our request
  searchMoviesURL.searchParams.append("type", "movie"); // since ShopifyDB only searches for movies, we should probably only query for movies
  searchMoviesURL.searchParams.append("y", "true"); // this includes the year of release in the response
  searchMoviesURL.searchParams.append("r", "json"); // tells the API we want JSON returned instead of XML
  searchMoviesURL.searchParams.append("page", page); // allows us to paginate the search
  searchMoviesURL.searchParams.append("tomatoes", "true"); // here's an easter egg, we can grab movie ratings/links to reviews
  searchMoviesURL.searchParams.append("s", query); // finally, the query we're searching for

  const searchResults = await (await fetch(searchMoviesURL)).json();
  return searchResults;
};

function App() {
  const [movies, setMovies] = useState([]); // all movies fetched
  const [numMovies, setNumMovies] = useState(0); // total amount of results for a search
  const [searchQuery, setSearchQuery] = useState(""); // search query
  const [searchQueryPage, setSearchQueryPage] = useState(1); // the page we're currently on
  const [nominated, setNominated] = useState([]); // nominated movies
  const [nominatedIMDB, setNominatedIMBD] = useState([]); // we use this state to quickly check to see if a movie has been nominated
  const [searchLoading, setSearchLoading] = useState(false); // self-explanatory
  const [nominatedToastActive, setNominatedToastActive] = useState(false); // state of nominated toast
  const [unnominatedToastActive, setUnnominatedToastActive] = useState(false); // state of unnominated toast
  const [displayBanner, setDisplayBanner] = useState(false); // state of max nominations banner

  // used for the ResourceList component
  const resourceName = {
    singular: "movie",
    plural: "movies",
  };

  /**
   * Nominates a movie
   * @param {any} movie Movie object
   */
  const nominate = (movie) => {
    // set the new nomination into state
    setNominatedIMBD([...nominatedIMDB, movie.imdbID]);
    setNominated([...nominated, movie]);

    // show a toast to let users know that their nomination has been saved
    setNominatedToastActive(true);
  };

  /**
   * Checks to see if a movie is already nominated
   * @param {string} imdbID - IMDB ID to check for
   */
  const isMovieNominated = (imdbID) => {
    return nominatedIMDB.filter((id) => id === imdbID).length > 0;
  };

  /**
   * Unnominates (denominates?) a movie
   * @param {any} movie Movie object
   */
  const unnominate = (movie) => {
    // filter out the movie
    setNominated(
      nominated.filter(
        (nominatedMovie) => nominatedMovie.imdbID !== movie.imdbID
      )
    );
    setNominatedIMBD(
      nominatedIMDB.filter((nominatedID) => nominatedID !== movie.imdbID)
    );

    // show a toast or two
    setUnnominatedToastActive(true);
  };

  // when the search query changes, update state and reset the page counter
  const handleSearchQueryChange = useCallback((value) => {
    setSearchQuery(value);
    setSearchQueryPage(1);
  }, []);

  /**
   * Increments the page count by an integer amount
   * @param {number} step Incremented step
   */
  const incrementPage = (step = 1) => {
    setSearchQueryPage(searchQueryPage + step);
  };

  /**
   * Helper function to render a movie ResourceItem
   * @param {any} movie Movie object
   */
  const renderMovie = (movie) => {
    const { Poster, Title, Year, imdbID } = movie;
    const media = (
      <Thumbnail
        source={Poster}
        size="large"
        alt={`Poster for the movie ${Title}`}
      />
    );

    return (
      <ResourceItem media={media} id={imdbID} accessibilityLabel={`${Title}`}>
        <div className="movie-card-container">
          <Stack>
            <Stack.Item fill>
              <Heading element="h3">{Title}</Heading>
              <p>{Year}</p>
            </Stack.Item>
            {/* disables nominations if the movie is nominated or if the max amount is reached */}
            {!isMovieNominated(imdbID) && nominated.length < 5 && (
              <Stack.Item>
                <Button onClick={() => nominate(movie)} size="slim" outline>
                  Nominate
                </Button>
              </Stack.Item>
            )}
          </Stack>
        </div>
      </ResourceItem>
    );
  };

  /**
   * Helper function to render the nominated movie ResourceItem
   * @param {any} movie Movie object
   */
  const renderNominatedMovie = (movie) => {
    const { Poster, Title, Year, imdbID } = movie;
    const media = (
      <Thumbnail
        source={Poster}
        size="large"
        alt={`Poster for the movie ${Title}`}
      />
    );

    return (
      <ResourceItem media={media} id={imdbID} accessibilityLabel={`${Title}`}>
        <Stack vertical>
          <Stack.Item>
            <Heading element="h3">{Title}</Heading>
            <p>{Year}</p>
          </Stack.Item>
          <Stack.Item>
            <Button onClick={() => unnominate(movie)} plain>
              Remove
            </Button>
          </Stack.Item>
        </Stack>
      </ResourceItem>
    );
  };

  // hydrates state with local storage on page load
  useEffect(() => {
    setNominated(hydrateFromLocalStorage("nominated") || []);
    setNominatedIMBD(hydrateFromLocalStorage("nominatedIMDB") || []);
  }, []);

  /**
   * Caches state in local storage when state is changed
   * This happens after hydration so it doesn't override the
   * values in local storage with empty arrays
   */
  useEffect(() => {
    cacheToLocalStorage("nominated", nominated);
    cacheToLocalStorage("nominatedIMDB", nominatedIMDB);
  }, [nominated, nominatedIMDB]);

  /**
   * Displays the max nominations banner when 5 movies are nominated
   * Alternatively, automatically closes it when there's still
   * space left for more nominations
   * 
   * Effect watches the nominated state
   */
  useEffect(() => {
    // check to see if this is the 5th nominated movie
    if (nominated.length === 5) {
      // display the banner
      setDisplayBanner(true);
    } else {
      setDisplayBanner(false)
    }
  }, [nominated]);

  /**
   * Fetches new movies when a new search is made
   * This effect should only call the API when search is changed, not when the page # is changed
   */
  useEffect(() => {
    const getSearchResults = async () => {
      // set the ResourceList to loading when fetching
      setSearchLoading(true);
      const movieSearchResults = await searchMovies(searchQuery);
      // if search results are returned
      if (movieSearchResults.Search) {
        setNumMovies(movieSearchResults.totalResults);
        // completely sets the state to the new search
        setMovies(movieSearchResults.Search);
      } else if (movieSearchResults.Response === "False") {
        // something went wrong
        // TODO: more complex error handling for various error states
        setMovies([]);
      }

      // stop loading when data is fetched
      setSearchLoading(false);
    };

    getSearchResults();
  }, [searchQuery]);

  /**
   * Fetches new movies when the search page is changed
   * This effect should only call the API when pagination is changed
   */
  useEffect(() => {
    // if changed, we grab the results and append them to the current movies state
    const getSearchResults = async () => {
      // set the ResourceList to loading when fetching
      setSearchLoading(true);
      const movieSearchResults = await searchMovies(
        searchQuery,
        searchQueryPage
      );
      // if search results are returned
      if (movieSearchResults.Search) {
        setNumMovies(movieSearchResults.totalResults);
        setMovies([...movies, ...movieSearchResults.Search]);
      } else if (movieSearchResults.Response === "False") {
        // something went wrong
        // TODO: more complex error handling for various error states
        setMovies([]);
      }
      // stop loading when data is fetched
      setSearchLoading(false);
    };

    getSearchResults();

    // we don't want exhaustive deps since 2 effects would run when the searchQuery is changed
    // we only want this one to run when the page is changed and the searchQuery is the same
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQueryPage]);

  const filterControl = (
    <TextField
      placeholder="Search movies"
      label="Search Movies"
      id="search"
      value={searchQuery}
      onClearButtonClick={() => handleSearchQueryChange("")}
      onChange={handleSearchQueryChange}
      labelHidden
      clearButton
    />
  );

  /**
   * Slightly clunky
   * This shows a toast when a movie is nominated
   */
  const nominatedToast = nominatedToastActive ? (
    <Toast
      content="Movie nominated"
      action={{
        content: "Undo",
        onAction: () => {
          // literally just removes the last movie nominated
          unnominate(nominated[nominated.length - 1]);
          setNominatedToastActive(false);
        },
      }}
      duration={10000}
      onDismiss={() => setNominatedToastActive(false)}
    />
  ) : null;

  /**
   * Still clunky
   * Shows a toast when a movie is unnominated
   */
  const unnominatedToast = unnominatedToastActive ? (
    <Toast
      content="Movie unnominated"
      duration={10000}
      onDismiss={() => setUnnominatedToastActive(false)}
    />
  ) : null;

  /**
   * The "pagination" (really infinite "scroll") footer component
   * Button is automatically disabled when limit is reached
   */
  const PaginationFooter = () => {
    let maxPages = Math.ceil(numMovies / 10); // gets the maximum amount of pages available for the search

    if (movies.length > 0) {
      return (
        <div className="movies-pagination">
          <Button
            primary
            disabled={searchQueryPage === maxPages}
            onClick={() => incrementPage(1)}
          >
            Load More
          </Button>
        </div>
      );
    }

    return null;
  };

  /**
   * Helper function to render the nomination banner
   * Banner appears when limit of 5 nominations is reached
   */
  const renderNominationBanner = () => {
    if (displayBanner) {
      return (
        <Banner
          title="You've nominated five movies!"
          status="success"
          onDismiss={() => {
            setDisplayBanner(false);
          }}
        >
          <p>
            Please remove a nominated movie if you would like to nominate
            another movie.
          </p>
        </Banner>
      );
    }
  };

  return (
    <Frame>
      <Page title="ShopifyDB" separator>
        <Stack vertical spacing="extraLoose">
          {renderNominationBanner()}
          <Layout>
            <Layout.Section>
              <Card>
                <ResourceList
                  showHeader
                  totalItemsCount={numMovies}
                  resourceName={resourceName}
                  items={movies}
                  renderItem={renderMovie}
                  loading={searchLoading}
                  // this part is a little janky because I'm just using the filter control for better UI
                  // definitely not semantically correct - it'll do though
                  filterControl={filterControl}
                />
                <PaginationFooter />
              </Card>
            </Layout.Section>
            <Layout.Section secondary>
              <Stack vertical spacing="tight">
                <div className="nominated-heading">
                  <Heading>
                    Nominated Movies{" "}
                    <Badge status="info">{nominated.length}</Badge>
                  </Heading>
                </div>
                <ResourceList
                  resourceName={resourceName}
                  emptyState={<EmptyNominations />}
                  items={nominated}
                  renderItem={renderNominatedMovie}
                />
              </Stack>
            </Layout.Section>
          </Layout>
        </Stack>
        {/* Throw in the toast markups here */}
        {nominatedToast}
        {unnominatedToast}
      </Page>
    </Frame>
  );
}

export default App;
