const express = require('express');
const axios = require('axios');
const router = express.Router();

// Request timeout configuration
const APIFY_REQUEST_TIMEOUT = 30000; // 30 seconds
const ACTOR_RUN_TIMEOUT = 120000; // 2 minutes

// Create axios instance with timeout
const apifyClient = axios.create({
  baseURL: 'https://api.apify.com/v2',
  timeout: APIFY_REQUEST_TIMEOUT,
});

// Middleware to validate API key presence
const validateApiKey = (req, res, next) => {
  console.log('validateApiKey middleware - headers:', {
    'api-key': req.headers['api-key'] ? 'present' : 'missing',
    'apikey': req.headers['apikey'] ? 'present' : 'missing'
  });
  
  const apiKey = req.headers['api-key'] || req.headers['apikey'];
  if (!apiKey) {
    console.log('validateApiKey middleware - API key missing');
    return res.status(400).json({ 
      success: false, 
      message: 'API key is required in headers' 
    });
  }
  console.log('validateApiKey middleware - API key found:', apiKey.slice(0, 10) + '...');
  req.apiKey = apiKey;
  next();
};

// Validate Apify API Key
router.post('/validate-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid API key is required' 
      });
    }

    console.log('Validating API key:', apiKey.slice(0, 10) + '...');

    const response = await apifyClient.get('/users/me', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    console.log('Apify API response:', response.status, response.data);

    if (response.data && response.data.data) {
      const userData = response.data.data;
      return res.json({ 
        success: true, 
        message: 'API key is valid',
        user: {
          username: userData.username,
          email: userData.email,
          plan: userData.plan
        }
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid API key response' 
      });
    }
  } catch (error) {
    console.error('Error validating API key:', error.message);
    console.error('Error response:', error.response?.status, error.response?.data);
    console.error('Error config:', error.config?.url, error.config?.method);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid API key. Please check your credentials.'
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(500).json({ 
        success: false, 
        message: 'User endpoint not found. API might be temporarily unavailable.'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to validate API key. Please try again.'
    });
  }
});

// Get user's actors
router.get('/my-actors', validateApiKey, async (req, res) => {
  try {
    const response = await apifyClient.get('/acts', {
      headers: { 'Authorization': `Bearer ${req.apiKey}` },
      params: { limit: 1000, desc: true }
    });

    return res.json({ 
      success: true, 
      actors: response.data.data.items.map(actor => ({
        id: actor.id,
        name: actor.name,
        username: actor.username,
        title: actor.title || actor.name,
        description: actor.description,
        isPublic: actor.isPublic,
        createdAt: actor.createdAt,
        modifiedAt: actor.modifiedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching user actors:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch your actors. Please try again.'
    });
  }
});

// Get public actors (Apify Store)
router.get('/public-actors', validateApiKey, async (req, res) => {
  try {
    const { category = '', search = '', limit = 50 } = req.query;
    
    const params = {
      limit: Math.min(parseInt(limit) || 50, 100),
      desc: true
    };
    
    if (search) {
      params.search = search;
    }
    
    if (category) {
      params.category = category;
    }

    const response = await apifyClient.get('/store', {
      headers: { 'Authorization': `Bearer ${req.apiKey}` },
      params
    });

    return res.json({ 
      success: true, 
      actors: response.data.data.items.map(actor => ({
        id: actor.id,
        name: actor.name,
        username: actor.username,
        title: actor.title || actor.name,
        description: actor.description,
        category: actor.categories?.[0],
        isPublic: true,
        featured: actor.featured,
        createdAt: actor.createdAt,
        modifiedAt: actor.modifiedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching public actors:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch public actors. Please try again.'
    });
  }
});

// Get actor details and input schema
router.get('/actor/:actorId', validateApiKey, async (req, res) => {
  try {
    const { actorId } = req.params;
    
    if (!actorId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Actor ID is required' 
      });
    }

    const response = await apifyClient.get(`/acts/${actorId}`, {
      headers: { 'Authorization': `Bearer ${req.apiKey}` }
    });

    const actorData = response.data.data;
    
    return res.json({ 
      success: true, 
      actor: {
        id: actorData.id,
        name: actorData.name,
        title: actorData.title || actorData.name,
        description: actorData.description,
        inputSchema: actorData.inputSchema,
        outputSchema: actorData.outputSchema,
        defaultRunInput: actorData.defaultRunInput || {},
        exampleRunInput: actorData.exampleRunInput || {},
        versions: actorData.versions
      }
    });
  } catch (error) {
    console.error('Error fetching actor details:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        success: false, 
        message: 'Actor not found' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch actor details'
    });
  }
});

// Run actor
router.post('/actor/:actorId/run', validateApiKey, async (req, res) => {
  try {
    const { actorId } = req.params;
    const input = req.body;
    
    console.log('Running actor:', actorId, 'with input:', JSON.stringify(input, null, 2));
    
    if (!actorId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Actor ID is required' 
      });
    }

    // Start the actor run
    const runResponse = await apifyClient.post(`/acts/${actorId}/runs`, input, {
      headers: {
        'Authorization': `Bearer ${req.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: ACTOR_RUN_TIMEOUT
    });

    console.log('Apify run response:', runResponse.status, runResponse.data);

    const runId = runResponse.data.data.id;
    const runStatus = runResponse.data.data.status;

    // Return run info immediately for async handling
    return res.json({
      success: true,
      runId: runId,
      status: runStatus,
      message: 'Actor run started successfully',
      checkStatusUrl: `/api/run/${runId}/status`
    });

  } catch (error) {
    console.error('Error running actor:', error.message);
    console.error('Error response data:', error.response?.data);
    console.error('Error response status:', error.response?.status);
    
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid input parameters',
        error: error.response.data?.error?.message || error.message
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to start actor run',
      error: error.message
    });
  }
});

// Check run status
router.get('/run/:runId/status', validateApiKey, async (req, res) => {
  try {
    const { runId } = req.params;
    
    const statusResponse = await apifyClient.get(`/actor-runs/${runId}`, {
      headers: { 'Authorization': `Bearer ${req.apiKey}` }
    });

    const runData = statusResponse.data.data;
    
    return res.json({
      success: true,
      runId: runData.id,
      status: runData.status,
      startedAt: runData.startedAt,
      finishedAt: runData.finishedAt,
      stats: runData.stats,
      meta: runData.meta
    });

  } catch (error) {
    console.error('Error checking run status:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to check run status'
    });
  }
});

// Get run results
router.get('/run/:runId/results', validateApiKey, async (req, res) => {
  try {
    const { runId } = req.params;
    const { format = 'json', limit = 100 } = req.query;
    
    const resultsResponse = await apifyClient.get(`/actor-runs/${runId}/dataset/items`, {
      headers: { 'Authorization': `Bearer ${req.apiKey}` },
      params: {
        format,
        limit: Math.min(parseInt(limit) || 100, 1000)
      }
    });

    return res.json({
      success: true,
      results: resultsResponse.data,
      count: Array.isArray(resultsResponse.data) ? resultsResponse.data.length : 1
    });

  } catch (error) {
    console.error('Error fetching run results:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch run results'
    });
  }
});

// Get actor categories
router.get('/categories', validateApiKey, async (req, res) => {
  try {
    // For now, return a static list of categories since /store/categories doesn't exist
    const mockCategories = [
      { id: 'data-extraction', title: 'Data Extraction' },
      { id: 'automation', title: 'Automation' },
      { id: 'social-media', title: 'Social Media' },
      { id: 'e-commerce', title: 'E-commerce' },
      { id: 'monitoring', title: 'Monitoring' },
      { id: 'ai-ml', title: 'AI & Machine Learning' }
    ];

    return res.json({ 
      success: true, 
      categories: mockCategories
    });
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch categories'
    });
  }
});

module.exports = router;
