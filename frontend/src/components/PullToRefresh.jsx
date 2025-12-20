import PullToRefresh from "../components/PullToRefresh";

export default function FeedPage() {
  const [posts, setPosts] = useState([]);

  const loadData = async () => {
    // Simulate an API call
    console.log("Fetching new posts...");
    await new Promise(resolve => setTimeout(resolve, 1500));
    // Fetch logic here...
  };

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="pt-20 px-4 pb-32">
        {/* Your Feed Posts Go Here */}
        <h1 className="text-xl font-black mb-4 uppercase">Sisters Feed</h1>
        {posts.map(post => <div key={post.id}>...</div>)}
      </div>
    </PullToRefresh>
  );
}