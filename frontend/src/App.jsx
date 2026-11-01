import { useState, useEffect } from 'react';
import axios from 'axios';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css';

const API_URL = 'http://localhost:3001/api/meals';
const EXTERNAL_CATEGORY_API = 'https://www.themealdb.com/api/json/v1/1/list.php';
const EXTERNAL_RECIPE_API = 'https://www.themealdb.com/api/json/v1/1/filter.php';
const defaultMeals = [
  {
    id: 'sesame-ginger-bowl',
    title: 'Sesame Ginger Bowl',
    prepTime: '12 min',
    calories: 420,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'greek-salmon-wrap',
    title: 'Greek Salmon Wrap',
    prepTime: '10 min',
    calories: 350,
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'smoothie-bowl',
    title: 'Smoothie Bowl',
    prepTime: '7 min',
    calories: 340,
    image: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'harvest-grain-bowl',
    title: 'Harvest Grain Bowl',
    prepTime: '15 min',
    calories: 280,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
  },
];
const calendarDays = ['Sun 20', 'Mon 21', 'Tue 22', 'Wed 23', 'Thu 24', 'Fri 25', 'Sat 26'];

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = {
    '/home': 'Home',
    '/recipes': 'Recipes',
    '/calendar': 'Calendar',
    '/groceries': 'Groceries',
    '/alternatives': 'Alternatives',
  }[location.pathname] || 'Home';
  const [meals, setMeals] = useState(defaultMeals);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [externalMeals, setExternalMeals] = useState([]);
  const [allExternalMeals, setAllExternalMeals] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Sun 20');
  const [mealToSchedule, setMealToSchedule] = useState(null);
  const [scheduleDay, setScheduleDay] = useState('Sun 20');
  const [scheduledMeals, setScheduledMeals] = useState({});
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Wash kale', checked: false },
    { id: 2, text: 'Chop tofu', checked: false },
  ]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [newMeal, setNewMeal] = useState({ title: '', prepTime: '', calories: '' });
  
  // Grocery items state
  const [groceries, setGroceries] = useState([
    { id: 1, name: 'Extra Firm Tofu (1 block)', category: 'Produce', checked: false },
    { id: 2, name: 'Greek Yogurt (32oz)', category: 'Dairy', checked: true },
    { id: 3, name: 'Quinoa & Brown Rice Pack', category: 'Pantry', checked: false }
  ]);
  const [newItem, setNewItem] = useState('');
  const [groceryFilter, setGroceryFilter] = useState('All');

  const navigateToTab = (tab) => {
    navigate(`/${tab.toLowerCase()}`);
  };

  const combinedMeals = [...meals, ...externalMeals].filter((meal, index, allMeals) =>
    allMeals.findIndex(candidate => candidate.title.toLowerCase() === meal.title.toLowerCase()) === index
  );
  const displayedMeals = combinedMeals.filter((meal) =>
    meal.title.toLowerCase().includes(recipeSearch.toLowerCase())
  );
  const visibleGroceries = groceries.filter(item =>
    groceryFilter === 'All' ||
    (groceryFilter === 'Active' && !item.checked) ||
    (groceryFilter === 'Checked' && item.checked)
  );

  // Keep the reference recipes visible and add valid custom MongoDB recipes.
  useEffect(() => {
    const loadMeals = async () => {
      try {
        const [categoryResults, localResults] = await Promise.all([
          axios.get(EXTERNAL_CATEGORY_API, { params: { c: 'list' } }),
          axios.get(API_URL),
        ]);

        const apiCategories = categoryResults.data.meals || [];
        setCategories(apiCategories.map(category => category.strCategory));
        const categoryResultsByCategory = await Promise.all(
          apiCategories.map(category =>
            axios.get(EXTERNAL_RECIPE_API, {
              params: { c: category.strCategory },
            })
          )
        );
        const allExternalMeals = categoryResultsByCategory.flatMap(result =>
          result.data.meals || []
        );
        const mappedExternalMeals = allExternalMeals.map(meal => ({
          id: `external-${meal.idMeal}`,
          title: meal.strMeal,
          prepTime: 'See recipe',
          calories: 'Not listed',
          image: meal.strMealThumb,
        }));
        setAllExternalMeals(mappedExternalMeals);
        setExternalMeals(mappedExternalMeals);
        const customMeals = localResults.data.filter((meal) =>
          meal.title?.trim() &&
          meal.title.toLowerCase() !== 'ying' &&
          !defaultMeals.some((defaultMeal) =>
            defaultMeal.title.toLowerCase() === meal.title.toLowerCase()
          )
        );
        setMeals([...defaultMeals, ...customMeals]);
      } catch (err) {
        console.error('Error fetching recipes:', err);
      }
    };

    loadMeals();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    let active = true;

    axios.get(EXTERNAL_RECIPE_API, {
      params: { c: selectedCategory },
    })
      .then(({ data }) => {
        if (active) {
          setExternalMeals((data.meals || []).map(meal => ({
            id: `external-${meal.idMeal}`,
            title: meal.strMeal,
            prepTime: 'See recipe',
            calories: 'Not listed',
            image: meal.strMealThumb,
          })));
        }
      })
      .catch(err => console.error('Error fetching category recipes:', err));

    return () => {
      active = false;
    };
  }, [selectedCategory]);

  const toggleGrocery = (id) => {
    setGroceries(groceries.map(g => g.id === id ? { ...g, checked: !g.checked } : g));
  };

  const addGrocery = (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setGroceries([...groceries, { id: Date.now(), name: newItem, category: 'Custom', checked: false }]);
    setNewItem('');
  };

  const clearCheckedGroceries = () => {
    setGroceries(groceries.filter(item => !item.checked));
  };

  const addMeal = (e) => {
    e.preventDefault();
    if (!newMeal.title.trim() || !newMeal.prepTime || !newMeal.calories) return;

    axios.post(API_URL, {
      title: newMeal.title.trim(),
      prepTime: `${newMeal.prepTime} min`,
      calories: Number(newMeal.calories),
    })
      .then(({ data }) => {
        setMeals([...meals, data]);
        setNewMeal({ title: '', prepTime: '', calories: '' });
      })
      .catch(err => console.error('Error creating meal:', err));
  };

  const openSchedulePicker = (meal) => {
    setMealToSchedule(meal);
    setScheduleDay(selectedDay);
  };

  const scheduleMeal = (slot) => {
    const scheduleKey = `${scheduleDay}-${slot}`;
    setScheduledMeals({ ...scheduledMeals, [scheduleKey]: mealToSchedule });
    setSelectedDay(scheduleDay);
    setMealToSchedule(null);
  };

  const addChecklistItem = (event) => {
    event.preventDefault();
    const text = newChecklistItem.trim();
    if (!text) return;

    setChecklist([...checklist, { id: Date.now(), text, checked: false }]);
    setNewChecklistItem('');
  };

  const toggleChecklistItem = (id) => {
    setChecklist(checklist.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const clearCompletedChecklistItems = () => {
    setChecklist(checklist.filter(item => !item.checked));
  };

  const MealCard = ({ meal }) => (
    <article className="food-card">
      <img
        src={meal.image || defaultMeals[0].image}
        alt={meal.title}
        className="card-img"
      />
      <div className="meal-card-content">
        <h4 className="card-title">{meal.title}</h4>
        <div className="card-meta">⏱ {meal.prepTime} • 🔥 {meal.calories} kcal</div>
        <button className="btn-primary card-action" onClick={() => openSchedulePicker(meal)}>
          + Add to Schedule
        </button>
      </div>
    </article>
  );

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={null} />
        <Route path="/recipes" element={null} />
        <Route path="/calendar" element={null} />
        <Route path="/groceries" element={null} />
        <Route path="/alternatives" element={null} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      {/* Top Navbar */}
      <nav className="top-navbar">
        <div className="brand-logo">
          <span>🌱</span> Pivots
        </div>
        <div className="nav-links">
          {['Home', 'Recipes', 'Calendar', 'Groceries', 'Alternatives'].map(tab => (
            <button
              key={tab}
              className={`nav-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => navigateToTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* Frame 1: HOME PAGE */}
      {activeTab === 'Home' && (
        <div>
          <div className="hero-banner">
            <div>
              <span style={{ fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>EVENING PLAN</span>
              <h1 className="hero-title">Plan without<br />the spiral.</h1>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Choose a meal to begin planning your week.</p>
              <button className="btn-primary" onClick={() => navigateToTab('Calendar')}>Plan This Week</button>
            </div>
            <img 
              src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80" 
              alt="Healthy Bowl" 
              style={{ width: '240px', height: '240px', borderRadius: '50%', objectFit: 'cover' }} 
            />
          </div>

          <div className="section-heading">
            <h3>FOR YOU</h3>
            <button className="text-button" onClick={() => navigateToTab('Recipes')}>See all →</button>
          </div>
          <div className="meal-gallery">
            {meals.slice(0, 4).map(meal => (
              <MealCard key={meal._id || meal.id} meal={meal} />
            ))}
          </div>
        </div>
      )}

      {/* Frame 2: RECIPES PAGE */}
      {activeTab === 'Recipes' && (
        <div>
          <div className="recipes-header">
            <div>
              <span className="eyebrow">YOUR COLLECTION</span>
              <h2>Recipes</h2>
              <p className="muted-copy">Browse your meals or add a new favorite.</p>
            </div>
            <form className="add-meal-form" onSubmit={addMeal}>
              <input aria-label="Meal name" type="text" placeholder="Meal name" value={newMeal.title} onChange={e => setNewMeal({ ...newMeal, title: e.target.value })} required />
              <input aria-label="Prep time in minutes" type="number" min="1" placeholder="Prep (min)" value={newMeal.prepTime} onChange={e => setNewMeal({ ...newMeal, prepTime: e.target.value })} required />
              <input aria-label="Calories" type="number" min="1" placeholder="Calories" value={newMeal.calories} onChange={e => setNewMeal({ ...newMeal, calories: e.target.value })} required />
              <button type="submit" className="btn-primary">Add meal</button>
            </form>
          </div>
          <input type="search" placeholder="Search your recipes..." className="search-input" value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} />
          <div className="filter-pills">
            <button
              type="button"
              className={`pill-btn ${selectedCategory === '' ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory('');
                setExternalMeals(allExternalMeals);
              }}
            >
              All
            </button>
            {categories.map(category => (
              <button
                type="button"
                key={category}
                className={`pill-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="meal-gallery">
            {displayedMeals.map(meal => (
              <MealCard key={meal._id || meal.id} meal={meal} />
            ))}
          </div>
        </div>
      )}

      {/* Frame 3: ALTERNATIVES / PIVOTS */}
      {activeTab === 'Alternatives' && (
        <div className="alternatives-page">
          <div className="alternatives-heading">
            <div>
              <h2>Healthy Pivots &amp; To-Go Foods</h2>
              <p>Low effort meal backups when you run out of energy.</p>
            </div>
          </div>
          <input type="text" placeholder="Search takeout options..." className="search-input" />
          
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                name: 'Sweetgreen',
                match: '94% Healthy Match',
                image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
                tags: ['Swap to brown rice', 'No croutons', 'Light dressing']
              },
              {
                name: 'Chipotle',
                match: '88% Healthy Match',
                image: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=800&q=80',
                tags: ['Chicken bowl', 'Pinto beans', 'Extra fajita veg']
              }
            ].map(store => (
              <div key={store.name} className="backup-card">
                <img className="backup-card-image" src={store.image} alt={`${store.name} meal`} />
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '12px' }}>
                  <strong>{store.name} <span style={{ color: 'var(--sage-btn)', fontSize: '13px', marginLeft: '10px' }}>{store.match}</span></strong>
                  <button className="btn-primary" style={{ fontSize: '12px' }}>Use as Backup</button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {store.tags.map(t => <span key={t} className="pill-btn" style={{ fontSize: '11px' }}>✓ {t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frame 4: CALENDAR PAGE */}
      {activeTab === 'Calendar' && (
        <div>
          <h2>Weekly Calendar</h2>
          <p style={{ color: 'var(--text-muted)' }}>THIS WEEK: 9/20 - 9/27</p>
          <div className="calendar-days">
            {calendarDays.map(day => (
              <div 
                key={day} 
                className={`day-chip ${selectedDay === day ? 'selected' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <div>{day.split(' ')[0]}</div>
                <strong>{day.split(' ')[1]}</strong>
              </div>
            ))}
          </div>

          <div className="calendar-slots">
            {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map(slot => {
              const meal = scheduledMeals[`${selectedDay}-${slot}`];
              return (
                <div className="calendar-slot" key={slot}>
                  <span className="slot-label">{slot}</span>
                  {meal ? (
                    <strong>{meal.title}</strong>
                  ) : (
                    <span className="slot-empty">Nothing scheduled</span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '16px' }}>
              <h4>Calories Budget</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--sage-dark)', margin: '10px 0 0' }}>1800 / 2100</p>
            </div>
            <div className="checklist-panel">
              <div className="checklist-header">
                <h4>Prep Checklist</h4>
                <button
                  className="text-button"
                  onClick={clearCompletedChecklistItems}
                  disabled={!checklist.some(item => item.checked)}
                >
                  Clear completed
                </button>
              </div>
              <form className="checklist-form" onSubmit={addChecklistItem}>
                <input
                  type="text"
                  aria-label="New checklist item"
                  placeholder="Add prep item..."
                  value={newChecklistItem}
                  onChange={event => setNewChecklistItem(event.target.value)}
                />
                <button type="submit" className="btn-secondary">Add</button>
              </form>
              <div className="checklist-items">
                {checklist.length === 0 ? (
                  <span className="slot-empty">No prep items yet.</span>
                ) : (
                  checklist.map(item => (
                    <label className={`checklist-item ${item.checked ? 'checked' : ''}`} key={item.id}>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleChecklistItem(item.id)}
                      />
                      <span>{item.text}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {mealToSchedule && (
        <div className="modal-backdrop" onClick={() => setMealToSchedule(null)}>
          <div className="schedule-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setMealToSchedule(null)} aria-label="Close">
              ×
            </button>
            <span className="eyebrow">ADD TO SCHEDULE</span>
            <h2>{mealToSchedule.title}</h2>
            <p className="muted-copy">Choose a date and meal slot.</p>
            <div className="schedule-days">
              {calendarDays.map(day => (
                <button
                  type="button"
                  key={day}
                  className={`schedule-day ${scheduleDay === day ? 'selected' : ''}`}
                  onClick={() => setScheduleDay(day)}
                >
                  <span>{day.split(' ')[0]}</span>
                  <strong>{day.split(' ')[1]}</strong>
                </button>
              ))}
            </div>
            <div className="schedule-options">
              {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map(slot => (
                <button key={slot} className="btn-secondary" onClick={() => scheduleMeal(slot)}>
                  {slot}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Frame 5: GROCERIES PAGE */}
      {activeTab === 'Groceries' && (
        <div className="groceries-page">
          <div className="groceries-heading">
            <h2>Groceries for Week 1</h2>
            <div className="groceries-actions">
              <button className="btn-secondary" onClick={clearCheckedGroceries} disabled={!groceries.some(item => item.checked)}>
                Clear Checked
              </button>
              <button className="btn-primary" onClick={() => setGroceryFilter('All')}>Cart</button>
            </div>
          </div>
          <form className="grocery-add-form" onSubmit={addGrocery}>
            <input
              type="text"
              placeholder="Add item"
              className="search-input"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
            />
            <button type="submit" className="btn-primary">Add</button>
          </form>
          <div className="grocery-filters" aria-label="Grocery filters">
            {['All', 'Active', 'Checked'].map(filter => (
              <button
                type="button"
                key={filter}
                className={`pill-btn ${groceryFilter === filter ? 'active' : ''}`}
                onClick={() => setGroceryFilter(filter)}
              >
                {filter}
              </button>
            ))}
            <button type="button" className="pill-btn">Filters</button>
            <button type="button" className="pill-btn">Filters</button>
          </div>
          <div className="grocery-list">
            {visibleGroceries.map(item => (
              <label className={`grocery-card ${item.checked ? 'checked' : ''}`} key={item.id}>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleGrocery(item.id)}
                />
                <span className="grocery-card-copy">
                  <strong>{item.name}</strong>
                  <small>{item.category} • Auto-synced from meal</small>
                </span>
                <span className="planned-label">Planned Meal</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;