import {
  Card,
  Heading,
  Layout,
  Page,
  ResourceItem,
  ResourceList,
  Title,
  TextField,
  Thumbnail,
  DisplayText,
} from "@shopify/polaris";
import { useCallback, useEffect, useState } from "react";
import "./App.css";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [nominated, setNominated] = useState([]);
  const [nominatedIMDB, setNominatedIMBD] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const nominate = (movie) => {
    setNominatedIMBD([...nominatedIMDB, movie.imdbID]);
    setNominated([...nominated, movie]);
  };

  const isMovieNominated = (imdbID) => {
    return nominatedIMDB.filter((id) => id === imdbID).length > 0;
  };

  const handleSearchQueryChange = useCallback(
    (value) => setSearchQuery(value),
    []
  );

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

  useEffect(() => {
    const getSearchResults = async () => {
      setSearchLoading(true);
      const movieSearchResults = await searchMovies(searchQuery);
      if (movieSearchResults.Search) {
        setMovies(movieSearchResults.Search);
      }
      setSearchLoading(false);
    };

    getSearchResults();
  }, [searchQuery]);

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

  return (
    <Page title="ShopifyDB" separator>
      <Layout>
        <Layout.Section>
          <Card>
            <ResourceList
              resourceName={resourceName}
              items={movies}
              renderItem={renderMovie}
              loading={searchLoading}
              // this part is a little janky because I'm just using the filter control for better UI
              // definitely not semantically correct - it'll do though
              filterControl={filterControl}
            />
          </Card>
        </Layout.Section>
        <Layout.Section secondary>
          <DisplayText size="medium">Nominated Movies</DisplayText>
          <ResourceList
            resourceName={resourceName}
            items={nominated}
            renderItem={renderMovie}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default App;
