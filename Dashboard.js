var Dashboard = {};

(function() {
    
    default_metrics = ['commits','authors'];
    default_selection = 'companies';
    default_companies = ['Rackspace','Red Hat','IBM'];
    
    function getAllProjects(limit, order) {
        var projects = {};
        $.each(Report.getDataSources(), function(index, ds) {
            var repos = ds.getReposData();
            if (order) repos = ds.sortRepos(order);
            if (limit) repos = repos.slice(0,limit-1);
            projects[ds.getName()] = repos;
        });
        return projects;
    }
    
    function getAllCompanies(limit, order) {
        var companies = {};
        $.each(Report.getDataSources(), function(index, ds) {
            var companies_ds = ds.getCompaniesData();
            if (order) companies_ds = ds.sortCompanies(order);
            if (limit) companies_ds = companies_ds.slice(0,limit-1);
            companies[ds.getName()] = companies_ds;
        });
        return companies;
    }
    
    function getAllMetrics(limit) {
        var metrics = {};
        var not_metrics = ['id','date','month','year'];
        $.each(Report.getDataSources(), function(index, ds) {
            var metrics_ds = [];
            for (key in ds.getData()) {
                if ($.inArray(key,not_metrics) > -1) continue;
                metrics_ds.push(key);
            }
            metrics[ds.getName()] = metrics_ds;
        });
        return metrics;
    }
    
    function getValuesForm(form_name) {
        var values = [];
        
        var form = document.getElementById(form_name);
        if (form === null) return values;
        for (var i = 0; i < form.elements.length; i++) {
            if (form.elements[i].type == "checkbox") {
                if (form.elements[i].checked === true)
                    values.push(form.elements[i].value);
            }
            else if (form.elements[i].type == "select-one") {
                for (var j = 0; j < form.elements[i].options.length; j++) {
                    var option = form.elements[i].options[j];
                    if (option.selected) values.push(option.value);                    
                }
            }
        }
        return values;        
    }
        
    // TODO: Breakdown this function when logic grows
    Dashboard.selection = function(name, all) {
        // TODO: Not supported project+companies filtering
        if (name === "companies" && all !== false) cleanSelector("projects");
        else if (name === "projects" && all !== false) cleanSelector("companies");
        if (all === true || all === false) allSelector(name, all);
        
        if (name==="releases") cleanSelectorList("year");
        if (name==="year") cleanSelectorList("releases");

        var projects = getValuesForm('form_dashboard_projects');
        var companies = getValuesForm('form_dashboard_companies');

        if (projects.length === 0 && companies.length === 0) {
            $.each(Report.getDataSources(), function (i, ds) {
                disableSelector("metrics_"+ds.getName(),false);
            });            
        } else {                   
            // Check data sources has companies or projects data
            $.each(Report.getDataSources(), function (i, ds) {
                if (name === "companies") {
                    if (ds.getCompaniesData().length === 0) {
                        cleanSelector("metrics_"+ds.getName());
                        disableSelector("metrics_"+ds.getName(),true);
                    }                
                } else if (name === "projects") {
                    if (ds.getReposData().length === 0) {
                        cleanSelector("metrics_"+ds.getName());
                        disableSelector("metrics_"+ds.getName(),true);
                    }             
                }
            });
        }
        
        displayViz();
    };
    
    function allSelector(name, status) {
        var form_name = "form_dashboard_" + name;
        var form = document.getElementById(form_name);
        for (var i = 0; i < form.elements.length; i++) {
            form.elements[i].checked = status;
        }        
    }
    
    function cleanSelector(name) {
        var form_name = "form_dashboard_" + name;
        var form = document.getElementById(form_name);
        for (var i = 0; i < form.elements.length; i++) {
            form.elements[i].checked = false;
        }
    }
    
    function cleanSelectorList(name) {
        var form_name = "form_dashboard_" + name;
        var form = document.getElementById(form_name);
        var select = form.elements[0];
        select.options[0].selected = true;
    }
    
    function disableSelector(name, status) {
        var form_name = "form_dashboard_" + name;
        var form = document.getElementById(form_name);
        for (var i = 0; i < form.elements.length; i++) {
            form.elements[i].disabled = status;
        }    
    }
    

    function buildSelector(ds, name, options) {
        var html = name + "";
        html += "<form id='form_dashboard_"+name+"'>";
        $.each(options, function(i,option) {
            html += '<input type=checkbox name="'+name+'_check_list" value="'
                + option + '" ';
            html += 'onClick="Dashboard.selection(\''+name+'\');"';
            html += 'id="' + option + '_check" ';
            if ($.inArray(option, default_metrics)>-1) html += 'checked ';
            if ($.inArray(option, default_companies)>-1) html += 'checked ';
            html += '>';
            html += option;
            html += '<br>'; 
        });
        html += '<input type=button value="All" ';
        html += 'onClick="Dashboard.selection(\''+name+'\',' + true + ')">';
        html += '<input type=button value="None" ';
        html += 'onClick="Dashboard.selection(\''+name+'\',' + false + ')">';
        html += "</form>";
        return html;
    }
    
    function cleanName(name) {
        var aux = name.split("_");
        var label = aux.pop();
        if (label === "") label = aux.pop();
        return label;
    }
    
    function displayViz(div_ds) {
        var div = $('#dashboard_viz');
        div.empty();
        // var div_ds = div.data('ds');
        var start = null;
        var end = null;
        
        var metrics = [];
        $.each(getAllMetrics(), function(ds, ds_metrics) {
            if (div_ds && div !== div_ds) return;
            metrics = 
                metrics.concat(getValuesForm('form_dashboard_metrics_'+ds));
        });
        var projects = getValuesForm('form_dashboard_projects');
        var companies = getValuesForm('form_dashboard_companies');
        var year = getValuesForm('form_dashboard_time').pop();
        var release = getValuesForm('form_dashboard_releases').pop();
        if (year === "") year = undefined;
        else {
            year = parseInt(year);
            start = year*12; 
            end = (year+1)*12;
        }
        if (release === "") release = undefined;
        else {
            var aux = release.split("_");
            start = parseInt(aux[0]);
            end = parseInt(aux[1]);
        }
        
        var config_metric = {show_desc: false, show_title: true, 
                show_legend: true};  
        $.each(Report.getDataSources(), function(index, ds) {
            if (div_ds && div_ds !== ds.getName()) return;
            $.each(metrics, function(index, metric) {
                if (!(metric in ds.getData()))  return;
                var metric_div = "dashboard_"+ds.getName()+"_"+metric;
                var new_div = "<div class='dashboard_graph' id='";
                new_div += metric_div+"'></div>";
                div.append(new_div);
                if (projects.length>0)
                    ds.displayBasicMetricMyRepos(projects, metric, metric_div, 
                        config_metric, start, end);
                else if (companies.length>0)
                    ds.displayBasicMetricMyCompanies(companies, metric, 
                            metric_div, config_metric, start, end);
                else {
                    config_metric.show_title = false;
                    var data = ds.getData();
                    if (year) data = Viz.filterYear(year, data);
                    Viz.displayBasicMetricsHTML([metric], data, 
                            metric_div, config_metric);
                }
            });
        });
    }

    var dashboard_divs = {
        "filter_companies": {
            convert: function() {
                var div = $('#filter_companies');
                var div_ds = div.data('ds');
                var limit = div.data('limit');
                var order = div.data('order');
                div.append('COMPANIES');
                if (limit) div.append(" (top "+limit+")");
                div.append("<br>");
                $.each(getAllCompanies(limit,order), function(ds, companies) {
                    if (div_ds && div_ds !== ds) return;
                    var options = [];
                    $.each(companies, function(index, company) {
                        options.push(company);
                    });
                    div.append(buildSelector(ds,"companies",options));
                });
            }
        },
        "filter_metrics": {
            convert: function() {
                var div = $('#filter_metrics');
                var div_ds = div.data('ds');
                var limit = div.data('limit');
                div.append('METRICS');
                if (limit) div.append(" (top "+limit+")");
                div.append("<br>");                
                $.each(getAllMetrics(limit), function(ds, metrics) {
                    if (div_ds && div_ds !== ds) return;
                    var options = [];
                    $.each(metrics, function(index, metric) {
                        options.push(metric);
                    });
                    div.append(buildSelector(ds,"metrics_"+ds,options));
                });
            }
        },
        "filter_projects": {
            convert: function() {
                var div = $('#filter_projects');
                var div_ds = div.data('ds');
                var limit = div.data('limit');
                var order = div.data('order');
                div.append("PROJECTS");
                if (limit) div.append(" (top "+limit+")");
                div.append("<br>");
                $.each(getAllProjects(limit, order), function(ds, projects) {
                    if (div_ds && div_ds !== ds) return;
                    var options = [];
                    $.each(projects, function(index, project) {
                        options.push(cleanName(project));
                    });
                    div.append(buildSelector(ds,"projects",options));
                });
            }
        },
        "filter_releases": {
            convert: function() {
                var name = "releases";
                var div = $('#filter_releases');
                var releases = {
                        // Apr 2011-Sep 2011
                        diablo: {
                            start: 2011*12+4,
                            end: 2011*12+9,                            
                        },
                        essex: {
                            start: 2011*12+9,
                            end: 2012*12+4
                        },
                        folsom: {
                            start: 2012*12+4,
                            end: 2012*12+9
                        },
                        grizzly: {
                            start: 2012*12+9,
                            end: 2013*12+4
                        }
                };                
                var html = "<form id='form_dashboard_"+name+"'>";
                html += "<select name='releases' ";
                html += "onChange=\"Dashboard.selection(\''+name+'\');\">";
                html += "<option value=''>releases</option>";
                $.each(releases, function(name, data) {
                   html += "<option value='"+data.start+"_"+data.end+"' ";
                   html += ">"+name+"</option>"; 
                });
                html += "</form>";
                div.html(html);
            }            
        },
        "filter_year": {
            convert: function() {
                var name = "year";
                var div = $('#filter_year');
                var years = ['2010','2011','2012','2013'];
                var html = "<form id='form_dashboard_"+name+"'>";
                html += "<select name='year' ";
                html += "onChange=\"Dashboard.selection(\''+name+'\');\">";
                html += "<option value=''>year</option>";
                $.each(years, function(i, year) {
                   html += "<option value='"+year+"' ";
                   html += ">"+year+"</option>"; 
                });
                html += "</form>";
                div.html(html);
            }            
        },
        "dashboard_viz": {
            convert: function() {
                Dashboard.selection(default_selection);
            }
        },
    };
    
    Dashboard.build = function() {
        $.each (dashboard_divs, function(divid, value) {
            if ($("#"+divid).length > 0) value.convert(); 
        });
    };    
})();

Loader.data_ready(function() {
    Dashboard.build();
});

