import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Search, 
  Clock, 
  BookOpen, 
  Sparkles, 
  Share2, 
  Heart, 
  MessageSquare, 
  TrendingUp, 
  ChefHat, 
  Calendar,
  AlertCircle,
  Hash,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import ShareSheet from '../components/ui/ShareSheet';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  date: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  image: string;
  tags: string[];
  summary: string;
  content: React.ReactNode;
}

export default function Blog() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [hasLiked, setHasLiked] = useState<Record<string, boolean>>({});

  const sections = [
    { id: "home", label: "Home" },
    { id: "mission", label: "Our Mission" },
    { id: "features", label: "Core Features" },
    { id: "how-it-works", label: "How It Works" },
    { id: "contact", label: "Contact Us" }
  ];

  const categories = ['All', 'Fast Cooking', 'Healthy Eating', 'Budget Friendly', 'Indian Cuisine', 'Dinner Blueprints'];

  const blogPosts = useMemo<BlogPost[]>(() => [
    {
      id: '1',
      slug: 'mastering-simple-food-recipes-5-minute-meals',
      title: 'Mastering Simple Food Recipes: The Ultimate 5-Minute Budget Kitchen Blueprint',
      subtitle: 'How to build high-nutrition, delicious menus using basic pantry staples and fast cooking techniques.',
      category: 'Fast Cooking',
      readTime: '6 min read',
      date: 'July 6, 2026',
      author: {
        name: 'Chef Marcus Vance',
        role: 'Culinary Director & Food Anthropologist',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1200',
      tags: ['simple food recipes', 'lazy dinner ideas', 'easy food in 5 minutes', 'cooking on a budget'],
      summary: 'Ditch the kitchen stress. Explore how simple food recipes, smart ingredients pairing, and express 5-minute techniques can turn everyday cooking into an effortless, budget-friendly culinary ritual.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p className="first-letter:text-5xl first-letter:font-serif first-letter:float-left first-letter:mr-3 first-letter:text-amber-accent first-letter:font-bold">
            The modern kitchen is often a battleground of fatigue. After a long workday, looking through a complicated <span className="text-white font-medium">food recipes list</span> can feel overwhelming, pushing us toward expensive takeout. However, the secret to maintaining consistency isn’t hours of elaborate preparation—it’s mastering <span className="text-white font-medium">simple food recipes</span> that rely on intuitive ingredient pairing, minimal pots, and fast, high-impact cooking methods.
          </p>

          <blockquote className="border-l-2 border-amber-accent pl-4 py-1 my-6 italic text-white/90 font-serif text-lg bg-white/[0.01] rounded-r-xl">
            "Cooking shouldn't be a test of stamina. The most memorable meals are often simple food recipes with few ingredients, cooked with respect for temperatures and simple seasonings."
          </blockquote>

          <h3 className="font-serif text-2xl text-white italic pt-4">The Express Revolution: Easy Food to Make in 5 Minutes</h3>
          <p>
            When time is short, knowing an <span className="text-amber-accent font-medium hover:underline">easy food to make in 5 minutes</span> is your ultimate nutritional shield. You don't need fancy tools to whip up quick meals. Think of express options like a high-protein scrambled egg wrap, a Greek chickpea salad, or seasoned avocado toast. 
          </p>
          <p>
            For those who want to eat clean without spending hours cooking, preparing <span className="text-white font-medium">easy food to make in 5 minutes healthy</span> forms the core of sustainable weight management. By focusing on nutrient-dense, whole ingredients, you can make an <span className="text-white font-medium">easy food to make in 5 minutes healthy for weight loss</span> that keeps you fully satiated.
          </p>

          <div className="my-8 p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
            <span className="text-[10px] font-mono uppercase font-black tracking-wider text-amber-accent block">Quick Reference Table</span>
            <h4 className="font-serif text-xl text-white italic">Express 5-Minute Culinary Blueprints</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="py-2.5 font-bold uppercase tracking-wider">Dish Concept</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider">Key Ingredients</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider">Aesthetic Focus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-400">
                  <tr>
                    <td className="py-3 text-white font-serif italic">5-Minute Warm Hummus Bowl</td>
                    <td className="py-3">Hummus, Olive oil, Smoked paprika, Pine nuts, Warm pita</td>
                    <td className="py-3">Deep swirl in the bowl, dusted with paprika</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-white font-serif italic">Classic Indian Yogurt Raita Salad</td>
                    <td className="py-3">Greek yogurt, Diced cucumber, Roasted cumin, Fresh mint</td>
                    <td className="py-3">Topped with micro-greens and cumin dust</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-white font-serif italic">Express Smashed Berry Dessert</td>
                    <td className="py-3">Raspberries, Greek yogurt, Honey, Mint, Shaved dark chocolate</td>
                    <td className="py-3">Stripe of chocolate across a white porcelain plate</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <h3 className="font-serif text-2xl text-white italic pt-4">No-Cook and Budget-Friendly Wellness</h3>
          <p>
            Cooking healthy food doesn't require a large budget. When assembling <span className="text-white font-medium">quick, easy healthy meals on a budget</span>, dry beans, oats, eggs, and frozen vegetables are your best friends. 
          </p>
          <p>
            If you want to save on utilities, try making <span className="text-white font-medium">easy food to make in 5 minutes healthy no cook</span> meals like a high-protein Mediterranean salad. Simply combine canned white beans, sliced cherry tomatoes, kalamata olives, dried oregano, and a splash of extra-virgin olive oil. This is a prime example of <span className="text-white font-medium">easy food to make in 5 minutes healthy on a budget</span> that provides essential fiber and clean energy without generating heat.
          </p>

          <h3 className="font-serif text-2xl text-white italic pt-4">Dinner Inspiration for the Busy & Lazy</h3>
          <p>
            We've all had evenings when we have zero cooking motivation. This is where <span className="text-white font-medium">lazy dinner ideas</span> shine. Instead of opening delivery apps, browse some <span className="text-white font-medium">simple food recipes for dinner</span> that utilize what you already have in your fridge.
          </p>
          <p>
            If you're cooking for two, our custom <span className="text-white font-medium">quick dinner ideas for 2</span> and <span className="text-white font-medium">simple food recipes for dinner for two</span> focus on elegant, one-pan dishes that minimize clean-up. For families, look for comforting <span className="text-white font-medium">simple food recipes for dinner for family</span>, or focus on wellness with nourishing <span className="text-white font-medium">simple food recipes for dinner healthy</span> options.
          </p>

          <h3 className="font-serif text-2xl text-white italic pt-4">Indian Culinary Staples: Bold Flavors, Fast Execution</h3>
          <p>
            Indian cuisine is famous for its rich spices, but it also features incredibly fast, comforting meals. If you enjoy spices, our <span className="text-white font-medium">food recipes Indian</span> section includes amazing vegetarian and vegan options.
          </p>
          <p>
            When preparing quick dinners, you can try <span className="text-white font-medium">simple Indian vegetarian recipes for dinner</span> like spiced Yellow Dal Tadka or Jeera Rice. For an evening treat, try an <span className="text-white font-medium">easy snacks to make in 5 minutes indian</span> style, like Chatpata Spiced Chana Salad—canned chickpeas tossed with chopped red onion, green chili, chat masala, and fresh lemon. These dishes are perfect examples of <span className="text-white font-medium">quick dinner recipes Indian</span> food lovers can enjoy on busy weeknights.
          </p>

          <h3 className="font-serif text-2xl text-white italic pt-4">Everyday Habits for Minimal Food Waste</h3>
          <p>
            The easiest way to reduce kitchen waste is to cook with what you have. Developing a collection of <span className="text-white font-medium">simple food recipes for everyday</span> cooking helps you creatively use left-over veggies, proteins, and grains.
          </p>
          <p>
            Whether you are searching for a rapid <span className="text-white font-medium">5-minute recipes for lunch</span>, a comforting <span className="text-white font-medium">5 minute recipes for dinner</span>, or a light <span className="text-white font-medium">5 minute recipes for snacks</span>, you can always make a delicious meal. Finish your meal with a quick <span className="text-white font-medium">5 minute recipes dessert</span> like warm honey-baked bananas, and enjoy the ease of delicious, waste-free home cooking!
          </p>
        </div>
      )
    },
    {
      id: '2',
      slug: 'easy-indian-snacks-5-minutes',
      title: 'Easy Snacks to Make in 5 Minutes: Indian Spiced Express Platters',
      subtitle: 'Elevating roadside chaat flavors into hyper-clean, quick kitchen snacks.',
      category: 'Indian Cuisine',
      readTime: '4 min read',
      date: 'July 5, 2026',
      author: {
        name: 'Pooja Nair',
        role: 'Traditional Spice Specialist',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=1200',
      tags: ['easy snacks to make in 5 minutes indian', 'food recipes Indian', 'quick dinner recipes Indian'],
      summary: 'Ditch the deep-fryer. Explore clean, high-fiber, bold-flavored easy snacks to make in 5 minutes Indian style, utilizing pantry staples like chickpeas, yogurt, and toasted cumin.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            When the mid-afternoon hunger strikes, we often reach for heavy, processed snacks. But what if you could assemble a nutritious, mouth-watering alternative in the time it takes to brew tea?
          </p>
          <p>
            Our guide to the best <span className="text-white font-medium">easy snacks to make in 5 minutes indian</span> style focuses on fresh, raw, and par-cooked ingredients that require zero heavy frying.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">The Street-Style Spiced Chickpea Tumbler (Chana Chaat)</h4>
          <p>
            Simply open a can of chickpeas, rinse thoroughly with cold water, and toss with finely diced cucumbers, red onions, tomatoes, and cilantro. Add a teaspoon of chaat masala, a squeeze of fresh lime, and a pinch of roasted cumin. This is an incredibly satisfying, fiber-rich option that doubles as one of our favorite <span className="text-white font-medium">simple Indian vegetarian recipes for dinner</span> starters.
          </p>
        </div>
      )
    },
    {
      id: '3',
      slug: 'budget-healthy-meals-for-one',
      title: 'Quick, Easy Healthy Meals on a Budget: Cooking Solo Without Waste',
      subtitle: 'Practical scaling guides to eliminate excess food purchasing and redundant prep.',
      category: 'Budget Friendly',
      readTime: '5 min read',
      date: 'July 4, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=1200',
      tags: ['quick, easy healthy meals on a budget', 'quick easy healthy meals for one', 'quick easy healthy meals for weight loss'],
      summary: 'A mathematical and tactical guide to designing single-serving meals that maximize raw ingredients and reduce weekly checkout expenses.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Cooking for one can be challenging. Most grocery items are packaged for families, leading to leftover ingredients that often go to waste.
          </p>
          <p>
            By shifting to <span className="text-white font-medium">quick, easy healthy meals on a budget</span>, you can shop smart and buy exactly what you need. Focus on ingredients you can easily divide, like block tofu, eggs, loose spinach, and loose sweet potatoes.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">The Golden Rule of Single-Portion Prep</h4>
          <p>
            When making <span className="text-white font-medium">quick easy healthy meals for one</span>, try to cook a base grain (like quinoa or brown rice) in a small batch, then vary your proteins and fresh toppings daily. This is also ideal for <span className="text-white font-medium">quick easy healthy meals for weight loss</span> because it makes calorie tracking simple and keeps meals portion-controlled.
          </p>
        </div>
      )
    },
    {
      id: '4',
      slug: 'quick-dinner-ideas-for-2-simple-food-recipes',
      title: 'Quick Dinner Ideas for 2: Simple Food Recipes for Dinner and Late Nights',
      subtitle: 'Nourishing plans for two that reduce dirty pans and kitchen fatigue.',
      category: 'Dinner Blueprints',
      readTime: '5 min read',
      date: 'July 7, 2026',
      author: {
        name: 'Chef Marcus Vance',
        role: 'Culinary Director & Food Anthropologist',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?auto=format&fit=crop&q=80&w=1200',
      tags: ['quick dinner ideas for 2', 'simple food recipes for dinner', 'lazy dinner ideas', 'simple food recipes for dinner for two'],
      summary: 'Making dinner for two should not be a chore. Discover simple food recipes for dinner that take the stress out of cooking, featuring quick dinner ideas for 2 and lazy dinner ideas for family meals.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            After a long day, preparing a meal can feel like a heavy task. We all search for <span className="text-white font-medium">Lazy dinner ideas</span> that satisfy our cravings without keeping us at the stove for hours. If you are cooking with a partner, our curated list of <span className="text-white font-medium">Quick dinner ideas for 2</span> will revolutionize your evening routine.
          </p>
          <p>
            When searching for <span className="text-white font-medium">Simple food recipes for dinner</span>, it is important to find balanced recipes that use minimal pans. Our favorite <span className="text-white font-medium">Simple food recipes for dinner for two</span> focus on one-pot pasta bakes, pan-seared fish with quick lemon asparagus, and custom loaded vegetable quesadillas.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Dinner for the Whole Family</h4>
          <p>
            If you are cooking for a larger table, these concepts easily scale up into <span className="text-white font-medium">Simple food recipes for dinner for family</span> gatherings. You can elevate standard dinners with <span className="text-white font-medium">Simple food recipes for dinner healthy</span> choices, like garlic-herb roasted chicken breasts alongside oven-roasted broccoli.
          </p>
          <p>
            For those times when you need food on the table instantly, you can rely on our easy <span className="text-white font-medium">5 minute recipes for dinner</span> like customized gourmet dynamic grain bowls or classic loaded wraps. Try these fast tips tonight!
          </p>
        </div>
      )
    },
    {
      id: '5',
      slug: 'food-recipes-breakfast-guide-easy-5-minutes',
      title: 'Food Recipes Breakfast Guide: Easy Food to Make in 5 Minutes for Kids and Family',
      subtitle: 'Jumpstart your morning with delicious, quick meals using our food recipes app.',
      category: 'Fast Cooking',
      readTime: '4 min read',
      date: 'July 7, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&q=80&w=1200',
      tags: ['food recipes breakfast', 'easy food to make in 5 minutes', 'food recipes app', 'easy food to make in 5 minutes for kids'],
      summary: 'Mornings are fast, but your breakfast shouldn\'t be sacrificed. Learn the best easy food to make in 5 minutes with our step-by-step food recipes breakfast guide for family wellness.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            A high-energy day begins with the ultimate breakfast. Many of us browse our <span className="text-white font-medium">Food recipes app</span> searching for delicious breakfast inspirations. Our comprehensive <span className="text-white font-medium">Food recipes breakfast</span> guide highlights dishes that are rich in nutrients yet fast to prepare.
          </p>
          <p>
            If your morning is chaotic, knowing some <span className="text-white font-medium">Easy food to make in 5 minutes</span> is a lifesaver. You can make an <span className="text-white font-medium">Easy food to make in 5 minutes with few ingredients</span>, such as a high-protein cottage cheese berry bowl or a rapid spinach egg scramble.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Healthy and Fast Meals for Your Loved Ones</h4>
          <p>
            For parents, creating <span className="text-white font-medium">Easy food to make in 5 minutes for kids</span> ensures your little ones get proper nutrition before school without any fuss. You can prepare delicious, warm oat bowls or berry-banana Greek yogurt parfaits that double as <span className="text-white font-medium">Easy food to make in 5 minutes for family</span> breakfasts.
          </p>
          <p>
            By choosing an <span className="text-white font-medium">Easy food to make in 5 minutes healthy</span>, you can skip sugary packaged cereals. Use these smart meal ideas to enjoy peaceful, nutritious, and incredibly speedy mornings with your loved ones!
          </p>
        </div>
      )
    },
    {
      id: '6',
      slug: 'quick-easy-healthy-meals-for-weight-loss',
      title: 'Quick Easy Healthy Meals for Weight Loss: Simple Food Recipes for Everyday Wellness',
      subtitle: 'Nutrient-dense single servings and smart meal prep strategies.',
      category: 'Healthy Eating',
      readTime: '6 min read',
      date: 'July 7, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&q=80&w=1200',
      tags: ['quick easy healthy meals for weight loss', 'simple food recipes for every day', 'food recipes list'],
      summary: 'Sustain your fitness goals with our handpicked food recipes list. Learn to make quick easy healthy meals for one and master smart portion control without sacrificing taste.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Weight management doesn\'t have to mean eating bland, boring foods. By organizing your kitchen around a curated <span className="text-white font-medium">Food recipes list</span>, you can enjoy delicious, vibrant dishes while staying in a calorie deficit.
          </p>
          <p>
            Our core mission is sharing <span className="text-white font-medium">Simple food recipes for every day</span> that are high in fiber and rich in lean proteins. Preparing <span className="text-white font-medium">Quick easy healthy meals for weight loss</span> is much simpler when you have pre-washed greens and cooked grains ready in your fridge.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">No-Cook and Single-Portion Solutions</h4>
          <p>
            For those living alone, cooking single-portion meals is easy with our <span className="text-white font-medium">Quick easy healthy meals for one</span> blueprint. You can whip up an <span className="text-white font-medium">Easy food to make in 5 minutes healthy no cook</span> meal, such as a fiber-packed Mediterranean cucumber and bean salad dressed with fresh lemon and a splash of olive oil.
          </p>
          <p>
            This is an exceptional example of an <span className="text-white font-medium">Easy food to make in 5 minutes healthy for weight loss</span> that keeps you feeling satisfied for hours. Browse our menu planner today to build your custom daily routine!
          </p>
        </div>
      )
    },
    {
      id: '7',
      slug: 'easy-snacks-to-make-in-5-minutes-indian-spiced',
      title: 'Easy Snacks to Make in 5 Minutes: Indian Spiced Vegetarian Platters',
      subtitle: 'A high-flavor culinary journey featuring authentic spices and quick ingredients.',
      category: 'Indian Cuisine',
      readTime: '5 min read',
      date: 'July 7, 2026',
      author: {
        name: 'Pooja Nair',
        role: 'Traditional Spice Specialist',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&q=80&w=1200',
      tags: ['easy snacks to make in 5 minutes indian', 'food recipes Indian', 'quick dinner recipes Indian', 'food recipes with ingredients'],
      summary: 'Add vibrant spice to your routine with quick dinner recipes Indian style. Explore simple Indian vegetarian recipes for dinner and high-fiber easy snacks to make in 5 minutes Indian style.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Traditional spice profiles have a unique way of turning plain ingredients into something extraordinary. If you enjoy bold, aromatic tastes, exploring <span className="text-white font-medium">Food recipes Indian</span> style is an incredibly rewarding culinary experience.
          </p>
          <p>
            You don\'t need to spend hours over a hot stove to enjoy authentic flavors. Our collection of <span className="text-white font-medium">Quick dinner recipes Indian</span> food lovers can make on busy weeknights includes spiced lentil soups, stir-fried vegetables, and express flatbreads.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Quick Indian Street-Food Inspired Snacks</h4>
          <p>
            When hunger strikes in the afternoon, try an <span className="text-white font-medium">Easy snacks to make in 5 minutes indian</span> style, like a tangy Tomato-Onion Peanut Chaat. It is a simple dish that you can quickly customize using our interactive <span className="text-white font-medium">Food recipes With ingredients</span> checklist.
          </p>
          <p>
            For a more substantial evening meal, try our comforting, high-protein <span className="text-white font-medium">Simple Indian vegetarian recipes for dinner</span>, like the classic Quick Tadka Dal paired with cumin rice. Experience the richness of traditional spices in record time!
          </p>
        </div>
      )
    },
    {
      id: '8',
      slug: 'simple-food-recipes-for-students-budget-meals',
      title: 'Simple Food Recipes for Students: Quick, Easy Healthy Meals on a Budget',
      subtitle: 'A survival guide for busy college students looking for cheap, delicious food.',
      category: 'Budget Friendly',
      readTime: '6 min read',
      date: 'July 7, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&q=80&w=1200',
      tags: ['simple food recipes for students', 'quick, easy healthy meals on a budget', 'food recipes website', 'simple food recipes website'],
      summary: 'Student life is busy, but you can still eat well! Check out simple food recipes for students, easy food to make in 5 minutes healthy on a budget, and simple food recipes snacks.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Being a student means balancing classes, homework, and social life. Often, we don\'t have much money or time to spend on cooking. That is why we created a clean, modern <span className="text-white font-medium">Food recipes Website</span> to help you cook fast, healthy meals.
          </p>
          <p>
            Our dedicated <span className="text-white font-medium">Simple food recipes website</span> contains a vast collection of delicious meals. If you browse our <span className="text-white font-medium">Simple food recipes</span> category, you\'ll find dishes designed specifically for low budgets and tiny dorm kitchens.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Budget Cooking and Quick Snacks</h4>
          <p>
            We also share popular visual guides on our <span className="text-white font-medium">Simple food recipes instagram</span> page. Our guides focus on <span className="text-white font-medium">Simple Food recipes with few ingredients</span>, like 3-ingredient black bean quesadillas or customized microwave egg mugs.
          </p>
          <p>
            When you need a quick study break, try our favorite <span className="text-white font-medium">Simple food recipes snacks</span> or prepare <span className="text-white font-medium">Quick, easy healthy meals on a budget</span>. You can make an <span className="text-white font-medium">Easy food to make in 5 minutes healthy on a budget</span>, such as a high-protein peanut butter banana wrap.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Healthy Lunches and Sweet Treats</h4>
          <p>
            Our student guide also covers quick <span className="text-white font-medium">5-minute Recipes for lunch</span> like seasoned chickpea salad wraps. For a midday energy boost, try a fast <span className="text-white font-medium">5 minute recipes for snacks</span>.
          </p>
          <p>
            If you want something sweet, look up <span className="text-white font-medium">Simple Food recipes sweet</span> desserts like chocolate avocado pudding or our fast <span className="text-white font-medium">5 minute recipes dessert</span> mug cake. Best of all, all our <span className="text-white font-medium">Food recipes in English</span> are explained step-by-step with simple, clear instructions. Try our easy <span className="text-white font-medium">food recipes</span> today to eat delicious food while keeping your budget safe!
          </p>
        </div>
      )
    },
    {
      id: '9',
      slug: 'food-recipes-with-ingredients-few-items',
      title: 'Food Recipes With Ingredients: Simple Meals with Few Ingredients',
      subtitle: 'Maximize flavor while minimizing your grocery shopping list.',
      category: 'Budget Friendly',
      readTime: '4 min read',
      date: 'July 8, 2026',
      author: {
        name: 'Chef Marcus Vance',
        role: 'Culinary Director & Food Anthropologist',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=1200',
      tags: ['food recipes with ingredients', 'simple food recipes with few ingredients', 'easy food to make in 5 minutes with few ingredients'],
      summary: 'Cooking delicious food does not require a long list of ingredients. Discover our top food recipes with ingredients that you likely already have, featuring simple food recipes with few ingredients and 5-minute solutions.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Many people believe that gourmet cooking requires a pantry packed with exotic spices and expensive items. However, our favorite <span className="text-white font-medium">Food recipes With ingredients</span> focus on using basic pantry staples to create maximum flavor with minimal effort. You can cook outstanding meals using just four or five items.
          </p>
          <p>
            By looking for <span className="text-white font-medium">Simple Food recipes with few ingredients</span>, you save both preparation time and grocery budget. For example, a classic Italian Pasta Cacio e Pepe requires only pasta, pecorino cheese, and black pepper. It is a perfect demonstration of how <span className="text-white font-medium">Simple food recipes</span> can shine without unnecessary complexity.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Ultra-Fast 5-Minute Options</h4>
          <p>
            When you are in a rush, you can prepare an <span className="text-white font-medium">Easy food to make in 5 minutes with few ingredients</span>. A sliced apple with warm almond butter and a sprinkle of cinnamon, or a high-protein Greek yogurt bowl with a handful of raw walnuts, provides steady energy and delicious taste without any cooking required. Try these minimal-ingredient recipes tonight!
          </p>
        </div>
      )
    },
    {
      id: '10',
      slug: 'simple-indian-vegetarian-recipes-for-dinner-healthy',
      title: 'Simple Indian Vegetarian Recipes for Dinner: Quick and Authentic',
      subtitle: 'Warm, comforting Indian meals that are perfect for a cozy night.',
      category: 'Indian Cuisine',
      readTime: '5 min read',
      date: 'July 8, 2026',
      author: {
        name: 'Pooja Nair',
        role: 'Traditional Spice Specialist',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1585938338392-50a59970d2ee?auto=format&fit=crop&q=80&w=1200',
      tags: ['simple indian vegetarian recipes for dinner', 'food recipes indian', 'quick dinner recipes indian', 'simple food recipes'],
      summary: 'Experience the joy of cooking authentic Indian food with our list of simple Indian vegetarian recipes for dinner. These quick dinner recipes Indian food fans love are simple and highly nutritious.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Indian cuisine is world-famous for its incredible depth of flavor and smart use of health-promoting spices. If you want to cook a warm, comforting meal, exploring <span className="text-white font-medium">Food recipes Indian</span> traditions will unlock a treasure chest of easy, plant-based ideas.
          </p>
          <p>
            A common misconception is that Indian meals take hours of simmering. Our curated collection of <span className="text-white font-medium">Quick dinner recipes Indian</span> cooks make at home features high-speed options like Aloo Jeera (cumin-spiced potatoes) and spiced yellow lentils that pair beautifully with warm flatbreads.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Nourishing Vegetarian Dinners</h4>
          <p>
            For a wholesome evening, we recommend cooking <span className="text-white font-medium">Simple Indian vegetarian recipes for dinner</span> like Paneer Bhurji (scrambled Indian cottage cheese with turmeric and green peas). It is one of the most popular <span className="text-white font-medium">Simple food recipes</span> because it takes less than fifteen minutes from prep to plate. Bring these authentic, aromatic flavors to your kitchen tonight!
          </p>
        </div>
      )
    },
    {
      id: '11',
      slug: 'lazy-dinner-ideas-simple-family-meals',
      title: 'Lazy Dinner Ideas: Simple Food Recipes for Dinner for Family Evenings',
      subtitle: 'Low-effort, high-reward meals that will satisfy your whole table.',
      category: 'Dinner Blueprints',
      readTime: '5 min read',
      date: 'July 8, 2026',
      author: {
        name: 'Chef Marcus Vance',
        role: 'Culinary Director & Food Anthropologist',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=1200',
      tags: ['lazy dinner ideas', 'simple food recipes for dinner', 'simple food recipes for dinner for family', 'food recipes'],
      summary: 'When the day is long and energy is low, these lazy dinner ideas are here to save the night. Discover simple food recipes for dinner that are perfect for feeding a hungry family.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            We have all experienced those hectic days when our energy is completely depleted by evening. Ordering expensive fast food is tempting, but having a collection of <span className="text-white font-medium">Lazy dinner ideas</span> in your mind is a much healthier and cheaper solution. Cooking doesn't need to be complex to taste amazing.
          </p>
          <p>
            Our favorite <span className="text-white font-medium">Simple food recipes for dinner</span> focus on one-sheet pan meals, single-pot pasta creations, and custom loaded baked potatoes. These methods drastically reduce cleanup time, letting you enjoy your evening in peace.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Quick Meals for the Whole Table</h4>
          <p>
            If you are cooking for a larger table, preparing <span className="text-white font-medium">Simple food recipes for dinner for family</span> gatherings is easy. You can build a custom taco bar or bake a large pan of cheesy vegetarian quesadillas. These healthy, delicious <span className="text-white font-medium">food recipes</span> ensure everyone gets a warm, home-cooked meal without keeping you in the kitchen all night.
          </p>
        </div>
      )
    },
    {
      id: '12',
      slug: 'simple-food-recipes-sweet-5-minute-dessert',
      title: 'Simple Food Recipes Sweet and Fast: 5 Minute Recipes Dessert Mug Cakes',
      subtitle: 'Settle your late-night sugar cravings with zero hassle.',
      category: 'Fast Cooking',
      readTime: '3 min read',
      date: 'July 8, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&q=80&w=1200',
      tags: ['simple food recipes sweet', '5 minute recipes dessert', 'easy food to make in 5 minutes'],
      summary: 'Satisfy your sweet tooth in seconds. Discover delicious simple food recipes sweet collections, featuring express 5 minute recipes dessert ideas and easy treats to make at home.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Late-night sweet cravings can strike when you least expect them. Baking a whole batch of cookies takes too long and creates a messy kitchen. That is why having a collection of fast, <span className="text-white font-medium">Simple Food recipes sweet</span> desserts is essential for every dessert lover.
          </p>
          <p>
            The easiest solution is a microwave mug cake, which is the ultimate <span className="text-white font-medium">Easy food to make in 5 minutes</span>. Simply whisk four tablespoons of flour, two tablespoons of sugar, a tablespoon of cocoa powder, and three tablespoons of milk inside a mug, then microwave for sixty seconds.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Express Sweet Creations</h4>
          <p>
            Other incredible <span className="text-white font-medium">5 minute recipes dessert</span> ideas include warm cinnamon apples with greek yogurt or a quick chocolate avocado pudding. Keep these sweet, low-effort food recipes list options handy for your next late-night craving!
          </p>
        </div>
      )
    },
    {
      id: '13',
      slug: 'easy-food-to-make-in-5-minutes-healthy-for-kids',
      title: 'Easy Food to Make in 5 Minutes Healthy: Nutritious Breakfast for Kids',
      subtitle: 'Kid-approved recipes that take less time than a commercial break.',
      category: 'Healthy Eating',
      readTime: '4 min read',
      date: 'July 8, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&q=80&w=1200',
      tags: ['easy food to make in 5 minutes healthy', 'easy food to make in 5 minutes for kids', 'food recipes breakfast', 'simple food recipes'],
      summary: 'Ensure your children start their day right. Our guide lists easy food to make in 5 minutes healthy and appetizing, highlighting fun food recipes breakfast ideas for kids.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Morning routines are incredibly fast-paced, especially for busy families with children. Skipping breakfast is never a good idea, but you do not need to wake up hours early to cook a nutritious meal. There are many delicious, <span className="text-white font-medium">Simple food recipes</span> that take less than five minutes.
          </p>
          <p>
            If you want to prepare a fast meal, look for an <span className="text-white font-medium">Easy food to make in 5 minutes healthy</span>. A great example is a banana peanut butter honey roll-up using a whole wheat wrap, or a dynamic fruit and Greek yogurt parfait layered with crunchy honey granola.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Fun Breakfasts Kids Love</h4>
          <p>
            These choices serve as the perfect <span className="text-white font-medium">Easy food to make in 5 minutes for kids</span>, giving them high-quality protein and complex carbohydrates for school focus. Our favorite <span className="text-white font-medium">Food recipes breakfast</span> lists focus on simple, visual, and colorful foods that make mornings happy and stress-free. Try them tomorrow morning!
          </p>
        </div>
      )
    },
    {
      id: '14',
      slug: 'quick-easy-healthy-meals-on-a-budget-for-students',
      title: 'Quick, Easy Healthy Meals on a Budget: Simple Food Recipes for Students',
      subtitle: 'Dorm-friendly nutrition that protects your bank account.',
      category: 'Budget Friendly',
      readTime: '5 min read',
      date: 'July 8, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&q=80&w=1200',
      tags: ['quick, easy healthy meals on a budget', 'simple food recipes for students', 'easy food to make in 5 minutes healthy on a budget', 'simple food recipes'],
      summary: 'Eat clean and save money with our simple food recipes for students. Learn to prepare quick, easy healthy meals on a budget and enjoy nutritious dinners in a flash.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            College life involves balancing tight schedules, exams, and social activities, usually on a very limited budget. Cooking complicated dishes is often impossible in tiny dorm kitchens. That is why finding high-quality, <span className="text-white font-medium">Simple food recipes for students</span> is a game-changer.
          </p>
          <p>
            Eating nutritious meals doesn\'t have to be expensive. Our budget kitchen guide specializes in showing you how to prepare <span className="text-white font-medium">Quick, easy healthy meals on a budget</span> using basic canned beans, whole grains, and seasonal vegetables.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Healthy and Cheap Cooking</h4>
          <p>
            By choosing an <span className="text-white font-medium">Easy food to make in 5 minutes healthy on a budget</span>, you can skip unhealthy instant noodles. Try a simple black bean and corn quesadilla, or a microwaved egg bowl with spinach and melted cheese. These <span className="text-white font-medium">Simple food recipes</span> are delicious, affordable, and incredibly fast to prepare. Enjoy eating well without blowing your budget!
          </p>
        </div>
      )
    },
    {
      id: '15',
      slug: 'quick-dinner-ideas-for-2-healthy-meals-for-one',
      title: 'Quick Dinner Ideas for 2: Simple Food Recipes for Dinner for Two',
      subtitle: 'Elegant date night or weeknight dinners built for busy pairs.',
      category: 'Dinner Blueprints',
      readTime: '4 min read',
      date: 'July 8, 2026',
      author: {
        name: 'Chef Marcus Vance',
        role: 'Culinary Director & Food Anthropologist',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=1200',
      tags: ['quick dinner ideas for 2', 'simple food recipes for dinner for two', 'quick easy healthy meals for one', 'simple food recipes'],
      summary: 'Simplify your evening cooking with our top quick dinner ideas for 2. Discover beautiful simple food recipes for dinner for two, or scale down for quick easy healthy meals for one.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Cooking for a small household has unique advantages, but preparing traditional, large recipes can lead to excessive food waste and massive leftovers. If you are cooking with a partner, our handpicked list of <span className="text-white font-medium">Quick dinner ideas for 2</span> is designed to make weeknight dining fun and effortless.
          </p>
          <p>
            By focusing on <span className="text-white font-medium">Simple food recipes for dinner for two</span>, you can enjoy restaurant-quality meals with very little prep. Think of quick pan-seared salmon with a light lemon cream sauce, or loaded Greek chicken pitas with fresh tzatziki.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Nourishing Single Portions</h4>
          <p>
            If you are dining alone, you can easily scale these down to create <span className="text-white font-medium">Quick easy healthy meals for one</span>. Mastering a few <span className="text-white font-medium">Simple food recipes</span> like a single-pan egg and vegetable scramble or a dynamic grain bowl ensures you always eat fresh, delicious, and healthy food!
          </p>
        </div>
      )
    },
    {
      id: '16',
      slug: 'food-recipes-app-best-simple-food-recipes-website',
      title: 'Our Food Recipes App: The Ultimate Simple Food Recipes Website Guide',
      subtitle: 'Access thousands of dishes, smart tools, and meal planning guides.',
      category: 'Fast Cooking',
      readTime: '5 min read',
      date: 'July 8, 2026',
      author: {
        name: 'Chef Marcus Vance',
        role: 'Culinary Director & Food Anthropologist',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1460306855393-0410f61241c7?auto=format&fit=crop&q=80&w=1200',
      tags: ['food recipes app', 'food recipes website', 'simple food recipes website', 'simple food recipes'],
      summary: 'Looking for the best food recipes website? Discover how our innovative food recipes app provides step-by-step guidance, meal prep lists, and quick recipes on your mobile screen.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            In the digital age, finding inspiration for your next meal is easier than ever. However, looking through endless blogs with complicated instructions can be tiring. That is why we designed our clean, modern <span className="text-white font-medium">Food recipes Website</span> to make healthy cooking accessible to everyone.
          </p>
          <p>
            Our dedicated <span className="text-white font-medium">Simple food recipes website</span> focuses on simple layouts, beautiful photography, and highly readable directions. We believe that everyone can cook, provided they have access to the right guides.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Your Personal Kitchen Assistant</h4>
          <p>
            For those who want to take their kitchen skills on the road, our intuitive <span className="text-white font-medium">Food recipes app</span> provides interactive grocery shopping lists, portion sliders, and step-by-step cooking modes. You can find thousands of <span className="text-white font-medium">Simple food recipes</span> tailored to your exact dietary goals and cooking time. Download our smart tool and start cooking today!
          </p>
        </div>
      )
    },
    {
      id: '17',
      slug: 'simple-food-recipes-instagram-healthy-meals',
      title: 'Simple Food Recipes Instagram Trends: Food Recipes List for Every Day',
      subtitle: 'Learn the viral tricks behind fast, beautifully plated everyday meals.',
      category: 'Healthy Eating',
      readTime: '4 min read',
      date: 'July 8, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=1200',
      tags: ['simple food recipes instagram', 'food recipes list', 'simple food recipes for every day'],
      summary: 'Bring social media magic to your kitchen! Our curated food recipes list shares the viral simple food recipes instagram chefs use to make healthy eating fast and attractive.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Social media platforms have completely changed how we think about home cooking. Today, beautiful food is no longer restricted to expensive, high-end restaurants. Many of us scroll through our <span className="text-white font-medium">Simple food recipes instagram</span> feeds to find inspiration for our next meal.
          </p>
          <p>
            But how do you turn a short, viral video into a real, satisfying dish? Our curated <span className="text-white font-medium">Food recipes list</span> takes the guesswork out of social media trends, giving you accurate measurements, proper cooking temperatures, and professional substitution tips.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Beautiful Everyday Meals</h4>
          <p>
            We focus on sharing <span className="text-white font-medium">Simple food recipes for every day</span> that are high in color and full of rich, satisfying flavors. By learning a few simple plating and garnish tricks, you can elevate your regular dinners into stunning, camera-ready meals. Try making one of our social media inspired creations tonight!
          </p>
        </div>
      )
    },
    {
      id: '18',
      slug: 'easy-snacks-to-make-in-5-minutes-indian-spiced-fast',
      title: 'Easy Snacks to Make in 5 Minutes Indian Street Style',
      subtitle: 'Spiced, crunchy, and refreshing snacks you can prepare instantly.',
      category: 'Indian Cuisine',
      readTime: '4 min read',
      date: 'July 8, 2026',
      author: {
        name: 'Pooja Nair',
        role: 'Traditional Spice Specialist',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=1200',
      tags: ['easy snacks to make in 5 minutes indian', '5 minute recipes for snacks', 'food recipes indian', 'simple food recipes'],
      summary: 'Whip up mouthwatering, authentic street-style snacks with our quick guide. Learn how to make easy snacks to make in 5 minutes Indian style, and discover quick 5 minute recipes for snacks.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Indian street food is legendary for its vibrant combinations of sweet, tangy, spicy, and crunchy flavors. When that afternoon hunger strikes, you do not need to settle for a boring bag of chips. You can create a healthy, authentic, and delicious snack in your own kitchen using simple spices.
          </p>
          <p>
            Our quick guide shows you how to make a classic, savory <span className="text-white font-medium">Easy snacks to make in 5 minutes indian</span> street-food lovers adore. Try a Quick Peanut Chaat by tossing roasted peanuts, diced onions, ripe tomatoes, fresh cilantro, lemon juice, and a pinch of chaat masala.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Express Spiced Delights</h4>
          <p>
            If you want to keep a library of fast ideas, our <span className="text-white font-medium">5 minute recipes for snacks</span> provides dozens of options like spiced cucumber coins and savory yogurt dips. Exploring these simple <span className="text-white font-medium">Food recipes Indian</span> snacks will bring beautiful, authentic spice to your everyday routine with absolute ease!
          </p>
        </div>
      )
    },
    {
      id: '19',
      slug: 'easy-food-to-make-in-5-minutes-healthy-weight-loss',
      title: 'Easy Food to Make in 5 Minutes Healthy for Weight Loss: Nutrition Guide',
      subtitle: 'Achieve your wellness goals with high-speed, nutrient-packed food recipes.',
      category: 'Healthy Eating',
      readTime: '5 min read',
      date: 'July 9, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=1200',
      tags: ['easy food to make in 5 minutes healthy for weight loss', 'quick easy healthy meals for weight loss', 'simple food recipes'],
      summary: 'Stay on track with your physical fitness journey using our nutrition-focused guide. Learn simple food recipes and delicious easy food to make in 5 minutes healthy for weight loss.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Many people believe that maintaining a healthy weight requires spending hours prepping food or drinking tasteless juices. However, building sustainable habits is much easier when you focus on <span className="text-white font-medium">Simple food recipes</span> that are both highly satisfying and incredibly fast to prepare.
          </p>
          <p>
            Our primary recommendation for busy mornings is finding an <span className="text-white font-medium">Easy food to make in 5 minutes healthy for weight loss</span>. For instance, a protein-rich Greek yogurt cup mixed with ground flaxseeds and organic blueberries can be made in sixty seconds and keeps your blood sugar stable.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">High-Speed Fueling Strategies</h4>
          <p>
            If you struggle to find time for cooking after your workouts, learning to build <span className="text-white font-medium">Quick easy healthy meals for weight loss</span> is a game changer. A high-protein canned tuna salad served over crisp cucumber slices is an outstanding lunch that requires zero heat and provides essential nutrients to fuel your recovery. Keep these simple rules in mind to achieve your weight loss goals!
          </p>
        </div>
      )
    },
    {
      id: '20',
      slug: 'lazy-dinner-ideas-simple-indian-vegetarian',
      title: 'Lazy Dinner Ideas: Simple Indian Vegetarian Recipes for Dinner',
      subtitle: 'Warm and comforting traditional dinners requiring very little cooking effort.',
      category: 'Indian Cuisine',
      readTime: '6 min read',
      date: 'July 9, 2026',
      author: {
        name: 'Pooja Nair',
        role: 'Traditional Spice Specialist',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1200',
      tags: ['lazy dinner ideas', 'simple indian vegetarian recipes for dinner', 'quick dinner recipes indian', 'food recipes indian'],
      summary: 'Combine low-effort cooking with authentic Indian spices. Read our list of lazy dinner ideas and discover nourishing, simple Indian vegetarian recipes for dinner that take very little time.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            After a hectic workday, the kitchen can feel like a stressful place. We often fall back on ordering takeout, which is both expensive and unhealthy. Thankfully, learning a few clever <span className="text-white font-medium">Lazy dinner ideas</span> can save you from eating out while ensuring you enjoy a hot, flavorful plate.
          </p>
          <p>
            If you love traditional spices, exploring <span className="text-white font-medium">Food recipes Indian</span> cooking style will show you how quickly you can make food. Traditional family dishes can easily be adapted into <span className="text-white font-medium">Quick dinner recipes Indian</span> food lovers can enjoy on late nights, like a quick chickpea curry using canned garbanzo beans.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Healthy and Hearty Vegetarian Bowls</h4>
          <p>
            Our favorite evening comfort meal is <span className="text-white font-medium">Simple Indian vegetarian recipes for dinner</span> like a spiced Masala Khichdi. It is a hearty one-pot rice and lentil dish that digests easily and nourishes your body with minimal cooking effort. Try it for your next lazy evening!
          </p>
        </div>
      )
    },
    {
      id: '21',
      slug: 'five-minute-recipes-for-snacks-easy-ideas',
      title: '5 Minute Recipes for Snacks: Simple Food Recipes Snacks with Few Ingredients',
      subtitle: 'Satisfy your afternoon cravings with fast, energy-boosting snack plates.',
      category: 'Fast Cooking',
      readTime: '4 min read',
      date: 'July 9, 2026',
      author: {
        name: 'Chef Marcus Vance',
        role: 'Culinary Director & Food Anthropologist',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=1200',
      tags: ['5 minute recipes for snacks', 'simple food recipes snacks', 'easy food to make in 5 minutes with few ingredients'],
      summary: 'Keep your energy high throughout the afternoon. Browse our top 5 minute recipes for snacks and discover delicious simple food recipes snacks that require very few ingredients.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            We are all familiar with the dreaded mid-afternoon energy slump. Having a quick, healthy snack is key to keeping your mind focused and your body active. Our library of <span className="text-white font-medium">5 minute recipes for snacks</span> is designed to rescue you from the vending machine with fast, nutritious options.
          </p>
          <p>
            You can make an <span className="text-white font-medium">Easy food to make in 5 minutes with few ingredients</span>, such as sliced celery stalks topped with peanut butter and sweet raisins, or baked whole grain pita triangles served with pre-made olive hummus. These take almost no time to assemble.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Delicious Midday Pick-Me-Ups</h4>
          <p>
            These <span className="text-white font-medium">Simple food recipes snacks</span> are excellent because they utilize basic ingredients you probably already have in your pantry. By preparing your snacks at home, you avoid processed preservatives and added sugars. Make your next study break delicious with these quick ideas!
          </p>
        </div>
      )
    },
    {
      id: '22',
      slug: 'simple-food-recipes-for-dinner-for-two-quick-ideas',
      title: 'Simple Food Recipes for Dinner for Two: Quick Dinner Ideas for 2',
      subtitle: 'Create romantic and effortless weeknight dinners tailored for small tables.',
      category: 'Dinner Blueprints',
      readTime: '5 min read',
      date: 'July 10, 2026',
      author: {
        name: 'Chef Marcus Vance',
        role: 'Culinary Director & Food Anthropologist',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200',
      tags: ['simple food recipes for dinner for two', 'quick dinner ideas for 2', 'simple food recipes for dinner'],
      summary: 'Cooking for two is a beautiful way to share your evening. Discover our favorite simple food recipes for dinner for two and learn highly creative quick dinner ideas for 2.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Cooking a meal together can be a wonderful, bonding experience at the end of the day. But when recipes are too complex or yield massive leftovers, cooking feels more like a chore. Our guide to <span className="text-white font-medium">Quick dinner ideas for 2</span> focuses on delicious, small-batch cooking that is fast and satisfying.
          </p>
          <p>
            When choosing <span className="text-white font-medium">Simple food recipes for dinner</span>, it is best to focus on high-quality ingredients that cook quickly. Our favorite <span className="text-white font-medium">Simple food recipes for dinner for two</span> include single-pan garlic butter shrimp with baby spinach, or a vibrant Mediterranean salad topped with roasted chicken and feta cheese.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Effortless Dining for Pairs</h4>
          <p>
            These smart dinner plans require minimal prep work and use only one or two pans. By keeping the cooking process straightforward, you can spend more time enjoying each other\'s company and less time standing over a hot stove. Try these simple, elegant meals tonight!
          </p>
        </div>
      )
    },
    {
      id: '23',
      slug: 'easy-food-to-make-in-5-minutes-no-cook',
      title: 'Easy Food to Make in 5 Minutes Healthy No Cook: Quick Summer Meals',
      subtitle: 'Keep your kitchen cool with fresh, crisp meals that require zero heat.',
      category: 'Fast Cooking',
      readTime: '4 min read',
      date: 'July 10, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=1200',
      tags: ['easy food to make in 5 minutes healthy no cook', 'easy food to make in 5 minutes', 'simple food recipes for every day'],
      summary: 'Stay cool and healthy when the weather gets warm. Our guide shares the ultimate easy food to make in 5 minutes healthy no cook meals, perfect as simple food recipes for every day.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            During the hot summer months, turning on your oven or stove can make your whole home feel incredibly uncomfortable. But skipping home-cooked food in favor of heavily processed snacks is not good for your health. That is why mastering a few <span className="text-white font-medium">Simple food recipes for every day</span> that require no heat is so important.
          </p>
          <p>
            If you want a satisfying, fresh lunch, look for an <span className="text-white font-medium">Easy food to make in 5 minutes healthy no cook</span> option. A great example is a loaded chickpea salad bowl mixed with diced cucumbers, ripe tomatoes, fresh parsley, and a simple dressing of olive oil and lemon juice.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Zero-Cook Nutrition Solutions</h4>
          <p>
            This dish is incredibly crisp, high in fiber, and takes less than five minutes to toss together. Other simple <span className="text-white font-medium">Easy food to make in 5 minutes</span> ideas include peanut butter banana wraps or a robust avocado white bean spread on sprouted wheat toast. Enjoy nutritious, heat-free dining today!
          </p>
        </div>
      )
    },
    {
      id: '24',
      slug: 'simple-food-recipes-for-dinner-family-guide',
      title: 'Simple Food Recipes for Dinner for Family: Happy Table Guide',
      subtitle: 'Create large, nourishing meals that both parents and children will love.',
      category: 'Dinner Blueprints',
      readTime: '5 min read',
      date: 'July 10, 2026',
      author: {
        name: 'Chef Marcus Vance',
        role: 'Culinary Director & Food Anthropologist',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&q=80&w=1200',
      tags: ['simple food recipes for dinner for family', 'simple food recipes for dinner', 'food recipes list'],
      summary: 'Bring your loved ones together around a delicious, wholesome meal. Explore our curated food recipes list for simple food recipes for dinner for family evenings.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Gathering around the dining table is one of the most beautiful ways for a family to connect at the end of a busy day. However, cooking separate meals to please picky eaters can exhaust parents. Organizing your weekly menu around a high-quality <span className="text-white font-medium">Food recipes list</span> will help you cook meals everyone loves.
          </p>
          <p>
            Our core focus is sharing delicious <span className="text-white font-medium">Simple food recipes for dinner</span> that are easy to customize at the table. For instance, cooking <span className="text-white font-medium">Simple food recipes for dinner for family</span> tables, like a build-your-own taco bar or custom baked pasta pans, lets everyone choose their favorite toppings.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Wholesome and Peaceful Family Dinners</h4>
          <p>
            By involving your children in assembling their plates, you teach them healthy eating habits and make mealtime fun. Our easy guides focus on simple, whole food ingredients that cook fast and keep your kitchen peaceful and organized. Try these happy family recipes tonight!
          </p>
        </div>
      )
    },
    {
      id: '25',
      slug: 'quick-easy-healthy-meals-for-one-student-budget',
      title: 'Quick Easy Healthy Meals for One: Simple Food Recipes for Students',
      subtitle: 'Master the art of single-portion cooking without wasting food or money.',
      category: 'Budget Friendly',
      readTime: '5 min read',
      date: 'July 11, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1515003848353-c0510b14bd10?auto=format&fit=crop&q=80&w=1200',
      tags: ['quick easy healthy meals for one', 'simple food recipes for students', 'quick, easy healthy meals on a budget'],
      summary: 'Ditch the frozen dinners and cook fresh! Learn how to make quick easy healthy meals for one and discover simple food recipes for students that save money and time.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Living alone or studying in a university dorm comes with a lot of freedom, but it also means you are responsible for feeding yourself. Often, single students fall into the trap of ordering fast food or buying highly processed microwave meals because they think cooking for one is too difficult.
          </p>
          <p>
            However, our selection of <span className="text-white font-medium">Simple food recipes for students</span> proves that you can cook fresh, delicious food in a tiny kitchen. Learning to make <span className="text-white font-medium">Quick easy healthy meals for one</span> ensures you eat balanced meals without creating massive mounds of leftovers.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Nutritious and Low-Cost Student Plates</h4>
          <p>
            By choosing to cook <span className="text-white font-medium">Quick, easy healthy meals on a budget</span>, you protect your physical health and save your wallet. Try a single-serving egg scramble with chopped tomatoes and spinach, or a rapid black bean quesadilla served with fresh salsa. These meals are satisfying, cheap, and ready in minutes!
          </p>
        </div>
      )
    },
    {
      id: '26',
      slug: 'easy-snacks-to-make-in-5-minutes-indian-spiced-healthy',
      title: 'Easy Snacks to Make in 5 Minutes Indian Style: Healthy Spiced Plates',
      subtitle: 'Add vibrant spice and crunch to your snack routine with simple spices.',
      category: 'Indian Cuisine',
      readTime: '4 min read',
      date: 'July 11, 2026',
      author: {
        name: 'Pooja Nair',
        role: 'Traditional Spice Specialist',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=1200',
      tags: ['easy snacks to make in 5 minutes indian', 'quick dinner recipes indian', 'food recipes indian'],
      summary: 'Add absolute magic to your afternoon snack routine. Learn how to prepare easy snacks to make in 5 minutes Indian style, using basic pantry spices.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            When that late afternoon hunger strikes, it is easy to reach for a packaged snack or a sweet treat. But these options often leave us feeling tired and sluggish an hour later. If you want a bold, energizing snack, exploring traditional <span className="text-white font-medium">Food recipes Indian</span> snacks is an amazing, healthy solution.
          </p>
          <p>
            Our quick guide shows you how to assemble an <span className="text-white font-medium">Easy snacks to make in 5 minutes indian</span> street-style snack. Try a quick Spiced Cucumber Chaat by tossing crisp, sliced cucumber rounds with a splash of fresh lime juice, black salt, and a pinch of roasted cumin powder.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Express Indian Spice Infusions</h4>
          <p>
            For a more substantial evening meal, we recommend exploring comforting, high-fiber <span className="text-white font-medium">Quick dinner recipes Indian</span> cooks make on busy nights. A bowl of warm, spiced yellow lentils served with steamed basmati rice takes very little effort and keeps you feeling satisfied. Enjoy these vibrant spices in record time!
          </p>
        </div>
      )
    },
    {
      id: '27',
      slug: 'simple-food-recipes-sweet-5-minute-dessert-treats',
      title: 'Simple Food Recipes Sweet and Decadent: 5 Minute Recipes Dessert',
      subtitle: 'Delight your taste buds with lightning-fast sweet treats and mug bakes.',
      category: 'Fast Cooking',
      readTime: '3 min read',
      date: 'July 11, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1541795795328-f073b763494e?auto=format&fit=crop&q=80&w=1200',
      tags: ['simple food recipes sweet', '5 minute recipes dessert', 'easy food to make in 5 minutes'],
      summary: 'Craving something sweet but don\'t want to bake? Discover simple food recipes sweet options and learn delicious 5 minute recipes dessert ideas you can make tonight.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Sometimes, you just need a small, sweet treat to finish a beautiful dinner or to celebrate a productive day. But baking a whole cake or a batch of chocolate chip cookies takes too much time and creates too many dirty dishes. That is why having a library of fast, <span className="text-white font-medium">Simple Food recipes sweet</span> desserts is essential.
          </p>
          <p>
            The easiest sweet solution is a customized microwave cookie or mug cake, which is the ultimate <span className="text-white font-medium">Easy food to make in 5 minutes</span>. Simply mix a tablespoon of butter, a tablespoon of brown sugar, three tablespoons of flour, and a handful of chocolate chips in a mug, then microwave for fifty seconds.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Express Sweet Bakes</h4>
          <p>
            Other excellent <span className="text-white font-medium">5 minute recipes dessert</span> ideas include warm cinnamon-roasted bananas topped with shredded coconut or a rapid chocolate almond butter spread on sliced strawberries. Keep these sweet, low-effort recipes handy for your next craving!
          </p>
        </div>
      )
    },
    {
      id: '28',
      slug: 'food-recipes-app-simple-food-recipes-website-reviews',
      title: 'Our Food Recipes App: The Ultimate Simple Food Recipes Website Portal',
      subtitle: 'Learn how to use smart digital tools to organize your weekly cooking schedule.',
      category: 'Fast Cooking',
      readTime: '5 min read',
      date: 'July 11, 2026',
      author: {
        name: 'Chef Marcus Vance',
        role: 'Culinary Director & Food Anthropologist',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1516685018646-549198525c1b?auto=format&fit=crop&q=80&w=1200',
      tags: ['food recipes app', 'food recipes website', 'simple food recipes website', 'food recipes in english'],
      summary: 'Discover the power of digital kitchen assistants. Learn how our food recipes app and simple food recipes website can help you cook delicious, high-speed meals.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            In today\'s fast-paced world, staying organized in the kitchen is key to maintaining a healthy lifestyle. However, searching through endless cookbook pages or complicated cooking blogs can be frustrating. That is why we built a clean, intuitive <span className="text-white font-medium">Food recipes Website</span> to make home cooking easy and fun.
          </p>
          <p>
            Our dedicated <span className="text-white font-medium">Simple food recipes website</span> focuses on highly readable, step-by-step instructions and simple ingredient lists. We believe that everyone should be able to cook delicious food, which is why all our <span className="text-white font-medium">Food recipes in English</span> are explained clearly with zero complex culinary jargon.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Smart Meal Planning Tools</h4>
          <p>
            To take your cooking skills to the next level, our companion <span className="text-white font-medium">Food recipes app</span> lets you save your favorite dishes, scale portion sizes automatically, and generate custom grocery shopping lists. Download our app today and experience how simple and rewarding home cooking can be!
          </p>
        </div>
      )
    }
  ], []);

  const filteredPosts = useMemo(() => {
    return blogPosts.filter(post => {
      const matchesSearch = 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [blogPosts, searchQuery, selectedCategory]);

  // Handle deep-linking via slug query parameter
  const postSlug = searchParams.get('post');
  useEffect(() => {
    if (postSlug) {
      const found = blogPosts.find(p => p.slug === postSlug);
      if (found) {
        setSelectedPost(found);
      } else {
        setSelectedPost(null);
      }
    } else {
      setSelectedPost(null);
    }
  }, [postSlug, blogPosts]);

  const handleSelectPost = (post: BlogPost | null) => {
    if (post) {
      setSearchParams({ post: post.slug });
    } else {
      setSearchParams({});
    }
  };

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHasLiked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentPostUrl = selectedPost 
    ? `${window.location.origin}/blog?post=${selectedPost.slug}` 
    : `${window.location.origin}/blog`;

  return (
    <div className="space-y-10 min-h-screen pb-12">
      {/* 5-Menu Floating Sticky Sub-Navigation Header */}
      <div className="sticky top-0 md:top-20 z-40 bg-onyx/85 backdrop-blur-md border-y border-white/5 py-3 px-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-accent animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">Zero-Waste Culinary Assistant</span>
          </div>
          
          <nav className="flex items-center overflow-x-auto no-scrollbar whitespace-nowrap gap-1.5 py-1 w-full md:w-auto justify-start md:justify-center">
            {sections.map((section) => (
              <Link
                key={section.id}
                to={`/#${section.id}`}
                className="px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all select-none cursor-pointer text-white/60 hover:text-white hover:bg-white/5 shrink-0"
              >
                {section.label}
              </Link>
            ))}
            <Link
              to="/blog"
              className="px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all select-none cursor-pointer bg-amber-accent text-black font-extrabold shadow-md shadow-amber-accent/15 shrink-0"
            >
              Blog
            </Link>
          </nav>
        </div>
      </div>

      {/* Blog Hero Header */}
      <div className="relative text-center max-w-4xl mx-auto px-4 pt-4 sm:pt-8 space-y-4">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-accent/5 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3.5 py-1 border border-white/10 bg-white/[0.02] text-white/80 rounded-full text-[9px] font-black uppercase tracking-widest leading-none">
          <BookOpen className="w-3.5 h-3.5 text-amber-accent" />
          <span>Gourmet Editorial</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl text-white font-normal leading-tight tracking-tight">
          The Kitchen <span className="italic text-amber-accent">Journal</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto font-light leading-relaxed">
          Expert-crafted cooking guides, budget grocery strategies, and simple food recipes designed to empower home chefs and prevent kitchen waste.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!selectedPost ? (
          // LIST VIEW
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Search and Category Filter Row */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/[0.01] border border-white/5 p-4 rounded-3xl">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search articles, keywords, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 bg-coal border border-white/10 rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-accent transition-all"
                />
              </div>

              {/* Categories */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all select-none whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-amber-accent text-black font-extrabold shadow-md shadow-amber-accent/10'
                        : 'text-white/40 hover:text-white/80 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Featured post highlight (Only if category is All or matches Fast Cooking, and there's no search query filter) */}
            {filteredPosts.length > 0 && searchQuery === '' && selectedCategory === 'All' && (
              <div 
                onClick={() => handleSelectPost(filteredPosts[0])}
                className="group relative grid grid-cols-1 lg:grid-cols-12 gap-6 bg-coal border border-white/5 hover:border-amber-accent/20 rounded-[40px] p-6 sm:p-8 shadow-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:translate-y-[-2px]"
              >
                {/* Image */}
                <div className="lg:col-span-7 h-64 sm:h-96 rounded-3xl overflow-hidden relative border border-white/5">
                  <img
                    src={filteredPosts[0].image}
                    alt={filteredPosts[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4 px-3.5 py-1.5 bg-black/40 backdrop-blur-md rounded-xl text-[10px] font-bold text-amber-accent uppercase tracking-wider border border-white/5">
                    {filteredPosts[0].category}
                  </div>
                </div>

                {/* Meta details */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-6 py-2">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-accent" />
                        {filteredPosts[0].date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-accent" />
                        {filteredPosts[0].readTime}
                      </span>
                    </div>

                    <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-white italic font-normal leading-tight group-hover:text-amber-accent transition-colors">
                      {filteredPosts[0].title}
                    </h2>

                    <p className="text-xs sm:text-sm text-gray-400 font-light leading-relaxed italic">
                      "{filteredPosts[0].summary}"
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {filteredPosts[0].tags.map(tag => (
                        <span key={tag} className="text-[10px] font-mono text-white/30 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <img
                        src={filteredPosts[0].author.avatar}
                        alt={filteredPosts[0].author.name}
                        className="w-10 h-10 rounded-full border border-white/10 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white">{filteredPosts[0].author.name}</p>
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{filteredPosts[0].author.role}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono uppercase font-black tracking-widest text-amber-accent group-hover:translate-x-1.5 transition-transform flex items-center gap-1">
                      Read Entry <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Grid of Remaining/Filtered Posts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post, idx) => {
                // Skip the first one in "All" view to prevent duplicate highlights
                if (searchQuery === '' && selectedCategory === 'All' && idx === 0) return null;

                const liked = hasLiked[post.id] || false;

                return (
                  <motion.div
                    key={post.id}
                    onClick={() => handleSelectPost(post)}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-coal border border-white/5 hover:border-amber-accent/20 rounded-[32px] overflow-hidden shadow-xl cursor-pointer flex flex-col justify-between h-full transition-all duration-300 hover:translate-y-[-2px]"
                  >
                    <div>
                      {/* Image Frame */}
                      <div className="h-48 overflow-hidden relative border-b border-white/5">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-lg text-[9px] font-bold text-amber-accent uppercase tracking-wider border border-white/5">
                          {post.category}
                        </div>
                      </div>

                      {/* Info Panel */}
                      <div className="p-6 space-y-4">
                        <div className="flex items-center gap-3 text-[9px] font-mono text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-accent/60" />
                            {post.date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-accent/60" />
                            {post.readTime}
                          </span>
                        </div>

                        <h3 className="font-serif text-xl text-white italic font-normal leading-snug group-hover:text-amber-accent transition-colors">
                          {post.title}
                        </h3>

                        <p className="text-xs text-gray-400 font-light leading-relaxed line-clamp-3">
                          {post.summary}
                        </p>
                      </div>
                    </div>

                    {/* Bottom row */}
                    <div className="px-6 pb-6 pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={post.author.avatar}
                          alt={post.author.name}
                          className="w-8 h-8 rounded-full border border-white/10 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-[10px] font-bold text-white leading-none">{post.author.name}</p>
                          <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-0.5">{post.author.role.split(' ')[0]}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => toggleLike(post.id, e)}
                          className={`p-2 rounded-full hover:bg-white/5 transition-all ${liked ? 'text-rose-500' : 'text-white/30'}`}
                          title="Like Article"
                        >
                          <Heart className="w-4 h-4" fill={liked ? "currentColor" : "none"} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-20 bg-coal rounded-[40px] border border-white/5 max-w-md mx-auto space-y-4">
                <AlertCircle className="w-12 h-12 text-amber-accent mx-auto animate-pulse" />
                <div className="space-y-1">
                  <h4 className="font-serif text-2xl text-white italic">No Entries Found</h4>
                  <p className="text-xs text-gray-500 font-light">We couldn't find any articles matching your search query.</p>
                </div>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                  className="px-5 py-2 border border-white/10 hover:border-amber-accent text-white hover:text-amber-accent rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          // DETAILED READER VIEW
          <motion.article
            key="reader-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35 }}
            className="max-w-4xl mx-auto bg-coal border border-white/5 rounded-[40px] overflow-hidden shadow-2xl relative"
          >
            {/* Elegant Top Navigation Header inside reader */}
            <div className="h-16 border-b border-white/5 px-6 sm:px-8 flex items-center justify-between">
              <button
                onClick={() => handleSelectPost(null)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-mono text-amber-accent bg-amber-accent/5 hover:bg-amber-accent/15 border border-amber-accent/20 hover:border-amber-accent/40 uppercase tracking-widest transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Journal</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => toggleLike(selectedPost.id, e)}
                  className={`p-2 rounded-full hover:bg-white/5 border border-white/5 transition-all ${hasLiked[selectedPost.id] ? 'text-rose-500 border-rose-500/20 bg-rose-500/5' : 'text-white/40'}`}
                >
                  <Heart className="w-4 h-4" fill={hasLiked[selectedPost.id] ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => setIsShareOpen(true)}
                  className="p-2 rounded-full hover:bg-white/5 border border-white/5 text-white/40 transition-all cursor-pointer"
                  title="Share Article"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Giant Immersive Header Banner */}
            <div className="h-64 sm:h-96 md:h-[420px] overflow-hidden relative border-b border-white/5">
              <img
                src={selectedPost.image}
                alt={selectedPost.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/40 to-black/30" />
              
              {/* Floating Meta */}
              <div className="absolute bottom-6 sm:bottom-10 left-6 sm:left-10 right-6 sm:right-10 space-y-3 sm:space-y-4">
                <span className="px-3.5 py-1 bg-amber-accent text-black rounded-lg text-[9px] font-black uppercase tracking-widest leading-none">
                  {selectedPost.category}
                </span>

                <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-white font-normal leading-tight tracking-tight drop-shadow-md">
                  {selectedPost.title}
                </h1>
              </div>
            </div>

            {/* Author and stats block */}
            <div className="px-6 sm:px-10 py-6 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <img
                  src={selectedPost.author.avatar}
                  alt={selectedPost.author.name}
                  className="w-12 h-12 rounded-full border border-white/10 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="text-sm font-semibold text-white leading-snug">{selectedPost.author.name}</p>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{selectedPost.author.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-accent/80" />
                  Published {selectedPost.date}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-accent/80" />
                  Estimated {selectedPost.readTime}
                </span>
              </div>
            </div>

            {/* Core Body Rich-Text content */}
            <div className="px-6 sm:px-10 py-8 sm:py-10">
              {selectedPost.content}

              {/* Persuasive Call To Action to Use the App */}
              <div className="mt-12 p-8 bg-gradient-to-br from-amber-accent/15 via-white/[0.02] to-transparent border border-amber-accent/30 rounded-[32px] space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-accent/15 flex items-center justify-center border border-amber-accent/30">
                    <Sparkles className="w-5 h-5 text-amber-accent animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-serif text-xl text-white italic leading-none">Ready to Cook Smarter?</h4>
                    <p className="text-[10px] font-bold text-amber-accent/60 uppercase tracking-widest mt-1">Combat waste and save money</p>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 font-light leading-relaxed">
                  Unlock the full power of your kitchen with the <strong className="text-white">Daily Meal Recipe App</strong>. Scan your pantry ingredients, instantly generate professional-grade recipes, and plan your weekly menu. Our users save an average of $120/month on groceries while eliminating household food waste.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {user ? (
                    <Link
                      to="/generate"
                      className="px-6 py-3 bg-amber-accent hover:bg-white text-black text-center font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-lg shadow-amber-accent/10 active:scale-95 cursor-pointer"
                    >
                      Generate Recipes Now
                    </Link>
                  ) : (
                    <Link
                      to="/auth"
                      className="px-6 py-3 bg-amber-accent hover:bg-white text-black text-center font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-lg shadow-amber-accent/10 active:scale-95 cursor-pointer"
                    >
                      Get Started Free
                    </Link>
                  )}
                  <Link
                    to="/discover"
                    className="px-6 py-3 border border-white/10 hover:border-white/20 text-white text-center font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all bg-white/[0.01] hover:bg-white/[0.03] active:scale-95 cursor-pointer"
                  >
                    Explore Public Recipes
                  </Link>
                </div>
              </div>
            </div>

            {/* Bottom tags and return footer */}
            <div className="px-6 sm:px-10 py-8 border-t border-white/5 bg-white/[0.01] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {selectedPost.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-mono text-white/30 bg-white/[0.02] border border-white/5 px-3 py-1 rounded-lg">
                    #{tag}
                  </span>
                ))}
              </div>

              <button
                onClick={() => { handleSelectPost(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-6 py-3 bg-amber-accent text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all text-center cursor-pointer shadow-lg active:scale-95"
              >
                Return to Journal List
              </button>
            </div>
          </motion.article>
        )}
      </AnimatePresence>

      {/* Share sheet sheet overlay */}
      {selectedPost && (
        <ShareSheet
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          title={selectedPost.title}
          text={selectedPost.summary}
          url={currentPostUrl}
          recipe={null}
        />
      )}
    </div>
  );
}
