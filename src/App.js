import {
  Card,
  Heading,
  Layout,
  Page,
  ResourceItem,
  ResourceList,
  TextField,
  Thumbnail,
  DisplayText,
  Toast,
  Frame,
  Banner,
  Stack,
  Pagination,
  EmptyState,
  Button,
} from "@shopify/polaris";
import { useCallback, useEffect, useState } from "react";
import "./App.css";
import EmptyNominations from "./components/EmptyNominations";
import { cacheToLocalStorage, hydrateFromLocalStorage } from "./util";

const apiKey = process.env.REACT_APP_API_KEY;
const apiURL = "http://www.omdbapi.com";

const resourceName = {
  singular: "movie",
  plural: "movies",
};

/**
 *
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
  const [movies, setMovies] = useState([]);
  const [numMovies, setNumMovies] = useState(0);
  const [searchQuery, setSearchQuery] = useState("La La Land"); // set a default search query, La La Land was surprisingly good
  const [searchQueryPage, setSearchQueryPage] = useState(1); // the page we're currently on
  const [nominated, setNominated] = useState([]);
  const [nominatedIMDB, setNominatedIMBD] = useState([]); // we use this state to quickly check to see if a movie has been nominated
  const [searchLoading, setSearchLoading] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [displayBanner, setDisplayBanner] = useState(false);

  const nominate = (movie) => {
    // check to see if this is the 5th nominated movie
    if (nominated.length === 4) {
      // display the banner
      setDisplayBanner(true);
    }

    // set the new nomination into state
    setNominatedIMBD([...nominatedIMDB, movie.imdbID]);
    setNominated([...nominated, movie]);

    // show a toast to let users know that their nomination has been saved
    setToastActive(true);
  };

  const isMovieNominated = (imdbID) => {
    return nominatedIMDB.filter((id) => id === imdbID).length > 0;
  };

  // unnominates (denominates?) a movie
  const unNominate = (movie) => {
    setNominated(
      nominated.filter(
        (nominatedMovie) => nominatedMovie.imdbID !== movie.imdbID
      )
    );
    setNominatedIMBD(
      nominatedIMDB.filter((nominatedID) => nominatedID !== movie.imdbID)
    );
  };

  const handleSearchQueryChange = useCallback((value) => {
    setSearchQuery(value);
    setSearchQueryPage(1);
  }, []);

  const incrementPage = (step = 1) => {
    setSearchQueryPage(searchQueryPage + step);
  };

  /**
   *
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

    const shortcutActions = isMovieNominated(imdbID)
      ? null
      : {
          content: "Nominate",
          accessibilityLabel: `Nominate ${Title}`,
          onAction: () => nominate(movie),
        };

    return (
      <ResourceItem
        media={media}
        id={imdbID}
        accessibilityLabel={`${Title}`}
        shortcutActions={shortcutActions}
      >
        <Heading element="h3">{Title}</Heading>
        <p>{Year}</p>
      </ResourceItem>
    );
  };

  /**
   *
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

    const shortcutActions = {
      content: "Remove",
      accessibilityLabel: `Remove ${Title} from nominated list`,
      onAction: () => unNominate(movie),
    };

    return (
      <ResourceItem
        media={media}
        id={imdbID}
        accessibilityLabel={`${Title}`}
        shortcutActions={shortcutActions}
      >
        <Heading element="h3">{Title}</Heading>
        <p>{Year}</p>
      </ResourceItem>
    );
  };

  // hydrates state with local storage on load
  useEffect(() => {
    setNominated(hydrateFromLocalStorage("nominated") || []);
    setNominatedIMBD(hydrateFromLocalStorage("nominatedIMDB") || []);
  }, []);

  // caches state in local storage
  // this was put after hydration so it doesn't override localstorage with an empty array
  useEffect(() => {
    cacheToLocalStorage("nominated", nominated);
    cacheToLocalStorage("nominatedIMDB", nominatedIMDB);
  }, [nominated, nominatedIMDB]);

  // dynamically fetches new movies based on search
  useEffect(() => {
    const getSearchResults = async () => {
      setSearchLoading(true);
      const movieSearchResults = await searchMovies(
        searchQuery
      );
      if (movieSearchResults.Search) {
        setNumMovies(movieSearchResults.totalResults);
        setMovies(movieSearchResults.Search);
      } else if (movieSearchResults.Response === "False") {
        // something went wrong
        // TODO: more complex error handling for various error states
        setMovies([]);
      }
      setSearchLoading(false);
    };

    getSearchResults();
  }, [searchQuery]);

  useEffect(() => {
    const getSearchResults = async () => {
      setSearchLoading(true);
      const movieSearchResults = await searchMovies(
        searchQuery,
        searchQueryPage
      );
      if (movieSearchResults.Search) {
        setNumMovies(movieSearchResults.totalResults);
        setMovies([...movies, ...movieSearchResults.Search]);
      } else if (movieSearchResults.Response === "False") {
        // something went wrong
        // TODO: more complex error handling for various error states
        setMovies([]);
      }
      setSearchLoading(false);
    };

    getSearchResults()
  }, [searchQuery, searchQueryPage])

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

  const toastMarkup = toastActive ? (
    <Toast
      content="Movie nominated"
      action={{
        content: "Undo",
        onAction: () => {
          unNominate(nominated[nominated.length - 1]);
          setToastActive(false);
        },
      }}
      duration={10000}
      onDismiss={() => setToastActive(false)}
    />
  ) : null;

  const PaginationFooter = () => {
    let maxPages = Math.ceil(numMovies / 10); // gets the maximum amount of pages available for the search
    console.log(maxPages === maxPages)
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
  };

  const renderNominationBanner = () => {
    if (displayBanner) {
      return (
        <Banner
          title="You've nominated five movies!"
          status="success"
          onDismiss={() => {
            setDisplayBanner(false);
          }}
        />
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
                <Heading>Nominated Movies</Heading>
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
        {toastMarkup}
      </Page>
    </Frame>
  );
}

export default App;
